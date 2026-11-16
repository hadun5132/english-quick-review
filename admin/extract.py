"""擷取教材文字，保留投影片與頁面邊界。"""
import io
import json
import re
import sys
import zipfile
from xml.etree import ElementTree as XML

MAX_EXPANDED = 120 * 1024 * 1024


def office(raw, ext):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        if sum(entry.file_size for entry in entries) > MAX_EXPANDED:
            raise ValueError("解壓縮後的教材太大。")
        names = archive.namelist()
        if ext == "pptx":
            pages = [name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)]
            pages.sort(key=lambda name: int(re.search(r"(\d+)\.xml", name)[1]))
        else:
            pages = ["word/document.xml"]
        result = []
        for page in pages:
            root = XML.fromstring(archive.read(page))
            paragraphs = [
                "".join(node.text or "" for node in paragraph.iter() if node.tag.endswith("}t"))
                for paragraph in root.iter() if paragraph.tag.endswith("}p")
            ]
            result.append("\n".join(paragraphs))
        return result


def pdf(raw):
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise ValueError("請安裝 pypdf：python -m pip install pypdf") from error
    reader = PdfReader(io.BytesIO(raw))
    if reader.is_encrypted:
        raise ValueError("請先解除 PDF 密碼。")
    return [page.extract_text() or "" for page in reader.pages]


if __name__ == "__main__":
    try:
        extension = sys.argv[1]
        raw = sys.stdin.buffer.read()
        pages = pdf(raw) if extension == "pdf" else office(raw, extension)
        if not any(re.search(r"[^\W_]", page) for page in pages):
            raise ValueError("擷取不到文字。若是掃描教材，請先做 OCR。")
        print(json.dumps({"pages": pages}, ensure_ascii=True))
    except Exception as error:
        print(json.dumps({"error": str(error) or "無法讀取教材。"}, ensure_ascii=True))
        sys.exit(1)
