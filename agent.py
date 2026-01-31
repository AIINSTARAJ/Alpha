import os
import json

from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from pydantic import BaseModel, Field
from typing import List

load_dotenv()

Key = os.environ.get('REASONER')

Utils = os.environ.get('UTILITY')

Model = 'gemini-2.5-flash'

Agent = 'gemini-2.5-flash'

""" Model Instantiation """
agent = GoogleGenerativeAI(model=Agent, temperature=0.7, google_api_key=Utils)
model = GoogleGenerativeAI(model=Model, temperature=0.4, google_api_key=Utils)

decomposer = GoogleGenerativeAI(model=Model, temperature=0.3, google_api_key=Utils)
reasoner = GoogleGenerativeAI(model=Model, temperature=0.5, google_api_key=Key)
synthesizer = GoogleGenerativeAI(model=Model, temperature=0.4, google_api_key=Key)

def refineText(text):
    """Refine the given text using AI."""

    Template = """
        You are a text refinement agent.
        Task:
            - Refine the text provided below by correcting grammar, improving clarity, and enhancing overall quality.
            - Your output should be a polished version of the input text.
            - Provide only the refined text without any additional commentary.
            - Focus is only on the grammartical and structural improvement of the text.
            - Do not change the original meaning of the text.
            - Ensure the refined text is coherent and easy to read.
            - Maintain the original context and intent of the Text.
            - Avoid adding any new information or details that were not present in the original text.
            - Keep the length of the refined text similar to the original text.
        Text:
            {Text}
    """

    prompt = PromptTemplate(
        input_variables=["text"],
        template= Template
    ).format(Text = text)

    response = model.invoke(prompt)

    return response

class AtomicQuestion(BaseModel):
    questions: List[str] = Field(description="List of atomic sub-questions")

class AtomicAnswer(BaseModel):
    question: str = Field(description="The atomic question")
    answer: str = Field(description="Concise answer to the atomic question")

class FinalSynthesis(BaseModel):
    synthesis: str = Field(description="Comprehensive synthesized answer")
    key_insights: List[str] = Field(description="Key insights from the analysis")


def decompose_query(query: str) -> List[str]:
    """
    Decompose a complex query into atomic, independent sub-questions.
    Following the Atom of Thoughts (AoT) framework from NeurIPS 2025.
    """
    
    template = """
        You are an expert at decomposing complex questions into atomic, independent sub-questions.

        CRITICAL RULES:
            1. Each sub-question must be COMPLETELY INDEPENDENT and self-contained
            2. Sub-questions should exhibit the memoryless property (Markov property)
            3. Each can be answered WITHOUT knowing the answers to other sub-questions
            4. Decompose into 3-5 atomic questions that cover all aspects of the original query
            5. Questions should be specific, focused, and directly answerable

        Original Query: {query}

        Return ONLY a valid JSON object in this EXACT format with no additional text:
        {{"questions": ["question 1", "question 2", "question 3"]}}
    """

    prompt = PromptTemplate(
        input_variables=["query"],
        template=template
    )
    
    chain = prompt | decomposer

    response = chain.invoke({"query": query})
    
    response = response.replace("```json","").replace("```","").strip()

    data = json.loads(response)

    return data["questions"]


def answer_atomic_question(question: str) -> str:
    """
    Answer a single atomic question independently.
    Each answer is generated without context from other questions.
    """
    
    template = """
        You are an expert analyst answering atomic questions with precision and clarity.

        TASK: Answer this specific question concisely but comprehensively.

        RULES:
            1. Provide a direct, factual answer
            2. Keep it focused and relevant (3-5 sentences)
            3. Include specific details, data, or examples when applicable
            4. Be precise and avoid vague statements
            5. This is a standalone answer - assume no prior context

        Question: {question}

        Provide your answer: 
    """

    prompt = PromptTemplate(
        input_variables=["question"],
        template=template
    )
    
    chain = prompt | reasoner

    response = chain.invoke({"question": question})
    
    return response.strip()


def synthesize_answers(original_query: str, atomic_qa_pairs: List[dict]) -> dict:
    """
    Synthesize atomic answers into a comprehensive final answer.
    Implements the contraction phase of the AoT framework.
    """
    
    qa_text = "\n\n".join([
        f"Sub-Question {i+1}: {qa['question']} \n Answer: {qa['answer']}"
        for i, qa in enumerate(atomic_qa_pairs)
    ])
    
    template = """
        You are an expert at synthesizing multiple pieces of information into a coherent, comprehensive answer.

        Original Query:
         
        {original_query}

        Atomic Analysis:
        {qa_pairs}

        TASK: Create a comprehensive synthesis that:
            1. Directly answers the original query
            2. Integrates insights from all atomic answers
            3. Identifies connections and patterns across the atomic answers
            4. Provides a clear, structured response
            5. Extracts 3-5 key insights or takeaways

        Return ONLY a valid JSON object in this EXACT format with no additional text:
            {{
                "synthesis": "Your comprehensive synthesized answer here",
                "key_insights": ["insight 1", "insight 2", "insight 3"]
            }}   
    """

    prompt = PromptTemplate(
        input_variables=["original_query", "qa_pairs"],
        template=template
    )
    
    chain = prompt | synthesizer

    response = chain.invoke({
        "original_query": original_query,
        "qa_pairs": qa_text
    })


    response = response.replace("```json","").replace("```","").strip()

    data = json.loads(response)

    return data


def reason(query: str) -> dict:
    """
    Main atomic reasoning pipeline.
    
    Process:
    1. Decomposition: Break query into atomic sub-questions
    2. Independent Reasoning: Answer each atomic question separately
    3. Synthesis: Combine atomic answers into final comprehensive answer
    
    Returns structured JSON with full reasoning trace.
    """
    
    try:
        """ 1. Atomic Decomposition"""
        atomic_questions = decompose_query(query)
        
        """ 2. Independent Atomic Reasoning"""
        atomic_answers = []
        for question in atomic_questions:
            answer = answer_atomic_question(question)
            atomic_answers.append({
                "question": question,
                "answer": answer
            })
        
        """ 3. Synthesis"""
        synthesis = synthesize_answers(query, atomic_answers)
        
        
        return {
            "status": "success",
            "original_query": query,
            "atomic_decomposition": atomic_questions,
            "atomic_reasoning": atomic_answers,
            "synthesis": synthesis["synthesis"],
            "key_insights": synthesis["key_insights"]
        }
        
    except Exception as e:
        return {
            "status": "Error!",
            "error": str(e),
            "message": "Failed to process query"
        }
