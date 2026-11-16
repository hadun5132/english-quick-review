"""擷取教材文字，保留投影片與頁面邊界。"""
import io
import json
import posixpath
import re
import sys
import zipfile
from xml.etree import ElementTree as XML

MAX_EXPANDED = 120 * 1024 * 1024


def slide_paths(archive):
    names = archive.namelist()
    presentation = "ppt/presentation.xml"
    if presentation not in names:
        pages = [name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)]
        return sorted(pages, key=lambda name: int(re.search(r"(\d+)\.xml", name)[1]))
    relations = XML.fromstring(archive.read("ppt/_rels/presentation.xml.rels"))
    targets = {node.attrib["Id"]: node.attrib["Target"] for node in relations}
    root = XML.fromstring(archive.read(presentation))
    paths = []
    for slide in root.findall("./{*}sldIdLst/{*}sldId"):
        relation = next(value for name, value in slide.attrib.items() if name.endswith("}id"))
        target = targets[relation]
        path = target.lstrip("/") if target.startswith("/") else posixpath.normpath("ppt/" + target)
        paths.append(path)
    return paths


def office(raw, ext):
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        entries = archive.infolist()
        if sum(entry.file_size for entry in entries) > MAX_EXPANDED:
            raise ValueError("解壓縮後的教材太大。")
        if ext == "pptx":
            pages = slide_paths(archive)
        else:
            pages = ["word/document.xml"]
        result = []
        for page in pages:
            root = XML.fromstring(archive.read(page))
            paragraphs = [
                "".join(node.text or "" for node in paragraph.iter() if node.tag.endswith("}t"))
                for paragraph in root.iter() if paragraph.tag.endswith("}p")
            ]
            if ext == "docx":
                result.extend(paragraphs)
            else:
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
