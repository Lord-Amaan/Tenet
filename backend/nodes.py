from dataclasses import asdict
import re
from langchain.messages import SystemMessage, ToolMessage, AIMessage, HumanMessage
from backend.state import MessagesState
from typing import Literal
from backend.tools import retrieve_context, retrieve_docs
from backend.config import model
from backend.citation import resolve_answer_citations
from backend.prompts import SYSTEM_PROMPT, QA_PROMPT


# Define tools
#--------------
tools = [retrieve_docs]
tools_by_name = {tool.name: tool for tool in tools}
model_with_tools = model.bind_tools(tools)

# LLM mode
#---------
def llm_call(state: dict):
    """Retrieve legal context before generating the grounded answer."""
    question = next(
        message.content
        for message in reversed(state["messages"])
        if isinstance(message, HumanMessage)
    )
    context, citations = retrieve_context(question)
    tool_message = ToolMessage(content=context, tool_call_id="local-retrieval")

    return {
        "messages": [tool_message],
        "citations": citations,
        "llm_calls": state.get('llm_calls', 0) + 1
    }



# Tool Node
#-----------
def tool_node(state: dict):
    """Performs the tool call"""

    result = []
    new_citations = []
    for tool_call in state["messages"][-1].tool_calls:
        tool = tools_by_name[tool_call["name"]]
        tool_message = tool.invoke(tool_call)
        result.append(tool_message)
        if tool_message.artifact:
            new_citations.extend(tool_message.artifact)
    return {"messages": result, "citations": new_citations}

# Final answer Node
#------------------

def final_answer(state: dict):
    """Produce final answer once tool loop is done, with deterministic citations"""

    messages = state["messages"]

    context = "\n".join(m.content for m in messages if isinstance(m, ToolMessage))
    question = next(
        m.content for m in reversed(messages) if isinstance(m, HumanMessage)
    )

    language = state.get("language", "English")
    qa_prompt = QA_PROMPT.format(context=context, input=question)
    qa_prompt += (
        f"\n\nLanguage requirement: Respond entirely in {language}. "
        "Keep legal act names and section numbers accurate, but explain them "
        "naturally in the requested language."
    )

    result = model.invoke([HumanMessage(content=qa_prompt)])
    answer_text = re.split(r"\n\s*Sources\s*:", result.content, maxsplit=1, flags=re.IGNORECASE)[0].strip()

    resolved_answer, kept_citations = resolve_answer_citations(
        answer_text, state.get("citations", [])
    )
    sources = "\n".join(f"[{c.number}] {c.label}" for c in kept_citations)
    content = (
        f"{resolved_answer}\n\nSources:\n{sources}" if kept_citations else resolved_answer
    )

    return {
        "messages": [
            AIMessage(
                content=content,
                additional_kwargs={"citations": [asdict(c) for c in kept_citations]},
            )
        ]
    }





def should_continue(state: MessagesState) -> Literal["tool_node", "final_answer"]:
    """Decide if we should continue the loop or stop based upon whether the LLM made a tool call"""

    messages = state["messages"]
    last_message = messages[-1]

    # If the LLM makes a tool call, then perform an action
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tool_node"

    return "final_answer"