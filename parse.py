import argparse
import json
import re
import sys
from typing import Dict, List, Optional


def remove_category_markers(source_text: str) -> str:
    """Remove any category markers wrapped in full-width brackets, e.g., 【...】.

    The markers themselves and their content are removed entirely.
    """
    return re.sub(r"【[^】]*】", "", source_text)


def normalize_text_spacing(source_text: str) -> str:
    """Normalize whitespace without disrupting CJK punctuation.

    - Convert Windows newlines to \n
    - Collapse runs of whitespace to a single space
    - Preserve punctuation
    """
    text = source_text.replace("\r\n", "\n").replace("\r", "\n")
    # Replace all whitespace runs (including newlines and tabs) with a single space
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_question_blocks(clean_text: str) -> List[str]:
    """Split the input into blocks, each starting with '問題<digits>'."""
    starts = list(re.finditer(r"問題\s*(\d+)", clean_text))
    blocks: List[str] = []
    for idx, match in enumerate(starts):
        start_pos = match.start()
        end_pos = starts[idx + 1].start() if idx + 1 < len(starts) else len(clean_text)
        blocks.append(clean_text[start_pos:end_pos].strip())
    return blocks


def clean_fragment(text: str) -> str:
    """Trim and collapse inner whitespace for a small fragment."""
    return re.sub(r"\s+", " ", text).strip()


def parse_block_to_question(block_text: str) -> Optional[Dict]:
    """Parse a single question block into a structured dict.

    Expected general shape (flexible to spacing and punctuation):
        問題<NUM>、<QUESTION TEXT> （1）<option1> （2）<option2> ... 答案：(<NUM>)
    """
    # Capture number from the block header
    num_match = re.match(r"問題\s*(\d+)", block_text)
    if not num_match:
        return None
    question_number = int(num_match.group(1))

    # Remove the leading '問題<NUM>' and optional punctuation like 、，,。：
    after_header = block_text[num_match.end() :]
    after_header = re.sub(r"^[、,，．。:：\s]+", "", after_header)

    # Determine where the options start (first occurrence of (1) or （1）)
    first_option = re.search(r"[（(]\s*1\s*[）)]", after_header)
    answer_label_idx = after_header.find("答案")

    # The question text ends before the first option marker or '答案', whichever comes first
    end_candidates: List[int] = []
    if first_option:
        end_candidates.append(first_option.start())
    if answer_label_idx != -1:
        end_candidates.append(answer_label_idx)
    question_text_end = min(end_candidates) if end_candidates else len(after_header)
    question_text = clean_fragment(after_header[:question_text_end])

    # Extract options substring (between first option and '答案')
    options_region_start = first_option.start() if first_option else question_text_end
    options_region_end = (
        answer_label_idx if answer_label_idx != -1 else len(after_header)
    )
    options_region = after_header[options_region_start:options_region_end]

    # Parse options like （1）text （2）text ...
    answers: Dict[str, str] = {}
    option_pattern = re.compile(r"[（(]\s*(\d+)\s*[）)]\s*")
    option_matches = list(option_pattern.finditer(options_region))
    for idx, opt_match in enumerate(option_matches):
        option_number = opt_match.group(1)
        opt_text_start = opt_match.end()
        opt_text_end = (
            option_matches[idx + 1].start()
            if idx + 1 < len(option_matches)
            else len(options_region)
        )
        option_text = clean_fragment(options_region[opt_text_start:opt_text_end])
        answers[option_number] = option_text

    # Extract correct answer number
    correct_match = re.search(r"答案\s*[:：]?\s*[（(]?\s*(\d+)\s*[）)]?", after_header)
    correct_number: Optional[int] = (
        int(correct_match.group(1)) if correct_match else None
    )

    return {
        "number": question_number,
        "text": question_text,
        "answers": answers,
        "correct": correct_number,
    }


def parse_questions(source_text: str) -> List[Dict]:
    text_wo_categories = remove_category_markers(source_text)
    normalized = normalize_text_spacing(text_wo_categories)
    blocks = extract_question_blocks(normalized)
    results: List[Dict] = []
    for block in blocks:
        parsed = parse_block_to_question(block)
        if parsed is not None:
            results.append(parsed)
    return results


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Parse exam-like text into JSON questions."
    )
    parser.add_argument(
        "input", nargs="?", help="Path to input text file. Reads stdin if omitted."
    )
    parser.add_argument(
        "--output", "-o", help="Path to write JSON output. Prints to stdout if omitted."
    )
    args = parser.parse_args()

    if args.input:
        try:
            with open(args.input, "r", encoding="utf-8") as f:
                raw_text = f.read()
        except FileNotFoundError:
            print(f"Input file not found: {args.input}", file=sys.stderr)
            sys.exit(1)
    else:
        if sys.stdin.isatty():
            print(
                "Provide input via a file path or pipe text via stdin.", file=sys.stderr
            )
            sys.exit(2)
        raw_text = sys.stdin.read()

    questions = parse_questions(raw_text)
    output_json = json.dumps(questions, ensure_ascii=False, indent=2)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(output_json)
    else:
        print(output_json)


if __name__ == "__main__":
    main()
