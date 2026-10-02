from dataclasses import dataclass
import re


@dataclass(frozen=True)
class ProblemIntent:
    topic: str
    search_terms: tuple[str, ...]


_INTENT_RULES = (
    (
        "workplace harassment",
        ("sexual harassment", "harassment", "touching", "inappropriate messages", "boss", "manager", "workplace"),
        ("sexual harassment", "workplace", "POSH", "Internal Committee", "complaint", "employee", "employer"),
    ),
    (
        ("police", "arrest", "FIR", "assault", "threat", "stolen", "crime"),
            ("refund", "defective", "seller", "consumer", "product", "service", "fraud"),
        ("criminal offence", "police complaint", "FIR", "investigation", "BNS", "BNSS"),
    ),
    (
        ("refund", "defective", "seller", "consumer", "product", "service", "fraud"),
        ("refund", "defective", "seller", "consumer", "product", "service", " ಮೋசடி"),
        ("consumer complaint", "deficiency in service", "consumer protection", "refund"),
    ),
    (
        "vehicle matter",
        ("accident", "driving", "license", "licence", "vehicle", "traffic", "insurance"),
        ("motor vehicle", "driving licence", "traffic offence", "insurance claim"),
    ),
    (
        "cyber matter",
        ("online", "hack", "hacked", "scam", "OTP", "password", "account", "cyber"),
        ("cyber crime", "information technology", "online fraud", "identity theft"),
    ),
    (
        "child protection matter",
        ("child", "minor", "underage", "school abuse", "sexual abuse"),
        ("child protection", "POCSO", "minor", "sexual abuse"),
    ),
)


def classify_problem(query: str) -> ProblemIntent:
    normalized = query.lower()
    for topic, triggers, search_terms in _INTENT_RULES:
        if any(trigger.lower() in normalized for trigger in triggers):
            return ProblemIntent(topic=topic, search_terms=search_terms)

    return ProblemIntent(topic="general legal matter", search_terms=())


def expand_query(query: str) -> str:
    intent = classify_problem(query)
    return " ".join((query, intent.topic, *intent.search_terms))