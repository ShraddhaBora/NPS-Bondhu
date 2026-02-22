import os
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from operator import itemgetter
from dotenv import load_dotenv
from functools import lru_cache
import hashlib

# Load environment variables
load_dotenv()

VECTOR_STORE_DIR = "vector_store/"

# Configuration for optimized retrieval
RETRIEVAL_CONFIG = {
    "k": 5,  # Retrieve top 5 chunks (increased from 3)
    "fetch_k": 10,  # Fetch 10 candidates for MMR
    "score_threshold": 0.7,  # Minimum similarity score
    "lambda_mult": 0.7,  # MMR diversity parameter (0.7 = balanced)
}

def format_docs(docs):
    """Format documents with source information for better context"""
    formatted = []
    for i, doc in enumerate(docs, 1):
        source = os.path.basename(doc.metadata.get('source', 'Unknown'))
        page = doc.metadata.get('page', 'N/A')
        formatted.append(f"[Source {i}: {source}, Page {page}]\n{doc.page_content}")
    return "\n\n---\n\n".join(formatted)

def format_docs_simple(docs):
    """Simple format without metadata for cleaner responses"""
    return "\n\n".join(doc.page_content for doc in docs)

@lru_cache(maxsize=128)
def get_cached_embeddings():
    """Cache embeddings model to avoid reloading"""
    return HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

@lru_cache(maxsize=1)
def get_cached_vector_store():
    """Cache vector store to avoid reloading"""
    if not os.path.exists(VECTOR_STORE_DIR):
        raise FileNotFoundError(f"Vector store not found at {VECTOR_STORE_DIR}. Run ingest.py first.")
    
    embeddings = get_cached_embeddings()
    vector_store = FAISS.load_local(VECTOR_STORE_DIR, embeddings, allow_dangerous_deserialization=True)
    return vector_store

def get_optimized_retriever(search_type="mmr"):
    """
    Get an optimized retriever with configurable search type.
    
    Args:
        search_type: "similarity" | "mmr" | "similarity_score_threshold"
    """
    vector_store = get_cached_vector_store()
    
    if search_type == "mmr":
        # MMR: Maximal Marginal Relevance - balances similarity with diversity
        retriever = vector_store.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": RETRIEVAL_CONFIG["k"],
                "fetch_k": RETRIEVAL_CONFIG["fetch_k"],
                "lambda_mult": RETRIEVAL_CONFIG["lambda_mult"]
            }
        )
    elif search_type == "similarity_score_threshold":
        # Only return results above similarity threshold
        retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "score_threshold": RETRIEVAL_CONFIG["score_threshold"],
                "k": RETRIEVAL_CONFIG["k"]
            }
        )
    else:
        # Default similarity search with more results
        retriever = vector_store.as_retriever(
            search_kwargs={"k": RETRIEVAL_CONFIG["k"]}
        )
    
    return retriever

def get_llm(streaming=False):
    """
    Get LLM with optional streaming support.
    Uses Groq (Llama 3.3 70B) exclusively.
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    
    if not groq_api_key:
        raise ValueError(
            "GROQ_API_KEY environment variable is not set. "
            "Add it as a Secret in your HuggingFace Space settings."
        )
    
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=groq_api_key,
        temperature=0.1,
        streaming=streaming
    )
    if not streaming:
        print("✅ Using Groq LLM (Llama 3.3 70B)")
    
    return llm

def get_rag_chain(streaming=False, search_type="mmr", language="English"):
    """
    Initializes and returns an optimized RAG chain using LCEL.
    
    Args:
        streaming: Enable streaming responses for better UX
        search_type: "similarity" | "mmr" | "similarity_score_threshold"
        language: Language for responses ("English", "Hindi", "Assamese")
    
    Optimizations:
    - Smaller chunks (500 chars) for better precision
    - MMR search for diverse, non-redundant results
    - Similarity score filtering to remove low-quality matches
    - Cached embeddings and vector store for faster loading
    - Optional streaming for better perceived performance
    """
    
    # Get optimized retriever
    retriever = get_optimized_retriever(search_type)
    
    # Get LLM with streaming support
    llm = get_llm(streaming=streaming)

    # Create Prompt (always in English - translation handled externally)
    system_prompt = (
        "You are 'NPS Bondhu', an official assistant for the National Pension System (NPS). "
        "Use the following pieces of retrieved context to answer the question. "
        "If the answer is not in the context, say 'I am sorry, but I cannot find this information in the official NPS documents.' "
        "Do not make up answers. Keep the answer concise and helpful. "
        "If multiple sources provide similar information, synthesize them into a coherent answer. "
        "\n\n"
        "{context}"
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])

    # Create Chain using LCEL
    rag_chain = (
        {
            "context": itemgetter("input") | retriever | format_docs_simple, 
            "input": itemgetter("input")
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain

def get_sources_from_query(query, search_type="mmr"):
    """
    Retrieve source documents for a given query.
    Returns list of documents with metadata.
    """
    retriever = get_optimized_retriever(search_type)
    docs = retriever.invoke(query)
    return docs

def format_sources_for_display(docs):
    """
    Format source documents for display to user.
    Returns only the primary source name (without page number).
    """
    if not docs:
        return ""
    
    # Get the primary (first/most relevant) source
    primary_doc = docs[0]
    source_file = os.path.basename(primary_doc.metadata.get('source', 'Unknown'))
    
    # Remove .pdf extension if present
    if source_file.lower().endswith('.pdf'):
        source_file = source_file[:-4]
    
    # Clean up underscores/hyphens for readability
    source_name = source_file.replace('_', ' ').replace('-', ' ').strip()
    
    return source_name

def get_rag_chain_with_sources(streaming=False, search_type="mmr", language="English"):
    """
    Returns a RAG chain that provides both answer and sources.
    
    Args:
        streaming: Enable streaming responses
        search_type: Type of search to use
        language: Language for responses ("English", "Hindi", "Assamese")
    
    Returns:
        A function that takes a query and returns (answer, sources, source_docs)
    """
    retriever = get_optimized_retriever(search_type)
    llm = get_llm(streaming=streaming)
    
    # Create Prompt (always in English - translation handled externally)
    system_prompt = (
        "You are 'NPS Bondhu', an official assistant for the National Pension System (NPS). "
        "Use the following pieces of retrieved context to answer the question. "
        "If the answer is not in the context, say 'I am sorry, but I cannot find this information in the official NPS documents.' "
        "Do not make up answers. Keep the answer concise and helpful. "
        "If multiple sources provide similar information, synthesize them into a coherent answer. "
        "\n\n"
        "{context}"
    )


    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "{input}")
    ])
    
    def invoke_with_sources(query_dict):
        """Custom invoke that returns both answer and sources"""
        query = query_dict["input"]
        
        # Get source documents
        source_docs = retriever.invoke(query)
        
        # Format context for LLM
        context = format_docs_simple(source_docs)
        
        # Generate answer
        messages = prompt.invoke({"context": context, "input": query})
        answer = llm.invoke(messages).content
        
        # Format sources for display
        formatted_sources = format_sources_for_display(source_docs)
        
        return {
            "answer": answer,
            "sources": formatted_sources,
            "source_docs": source_docs
        }
    
    def stream_with_sources(query_dict):
        """Custom stream that yields answer chunks and returns sources at the end"""
        query = query_dict["input"]
        
        # Get source documents
        source_docs = retriever.invoke(query)
        
        # Format context for LLM
        context = format_docs_simple(source_docs)
        
        # Generate answer with streaming
        messages = prompt.invoke({"context": context, "input": query})
        
        # Yield answer chunks
        full_answer = ""
        for chunk in llm.stream(messages):
            content = chunk.content
            full_answer += content
            yield content
        
        # Return sources after streaming completes
        formatted_sources = format_sources_for_display(source_docs)
        
        # Store in a way that can be accessed after streaming
        return {
            "answer": full_answer,
            "sources": formatted_sources,
            "source_docs": source_docs
        }
    
    if streaming:
        return stream_with_sources
    else:
        return invoke_with_sources

def get_retrieval_stats(query):
    """
    Debug function to see what chunks are being retrieved.
    Useful for testing and optimization.
    """
    vector_store = get_cached_vector_store()
    
    # Get results with scores
    docs_with_scores = vector_store.similarity_search_with_score(query, k=10)
    
    print(f"\n{'='*80}")
    print(f"Query: {query}")
    print(f"{'='*80}\n")
    
    for i, (doc, score) in enumerate(docs_with_scores, 1):
        source = os.path.basename(doc.metadata.get('source', 'Unknown'))
        page = doc.metadata.get('page', 'N/A')
        print(f"Result {i} (Score: {score:.4f})")
        print(f"Source: {source}, Page: {page}")
        print(f"Content: {doc.page_content[:200]}...")
        print(f"{'-'*80}\n")
    
    return docs_with_scores

# Simple response cache for identical queries
_response_cache = {}

def get_cached_response(query, max_cache_size=50):
    """
    Simple cache for identical queries.
    Returns cached response if available, None otherwise.
    """
    query_hash = hashlib.md5(query.lower().strip().encode()).hexdigest()
    
    # Limit cache size
    if len(_response_cache) > max_cache_size:
        # Remove oldest entry
        _response_cache.pop(next(iter(_response_cache)))
    
    return _response_cache.get(query_hash)

def cache_response(query, response):
    """Cache a response for future use"""
    query_hash = hashlib.md5(query.lower().strip().encode()).hexdigest()
    _response_cache[query_hash] = response
