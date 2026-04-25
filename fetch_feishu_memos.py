import os
import re
import time
import io
import requests
from dotenv import load_dotenv
from docx import Document as DocxDocument

load_dotenv()

APP_ID = os.getenv("FEISHU_APP_ID")
APP_SECRET = os.getenv("FEISHU_APP_SECRET")
ROOT_FOLDER_TOKEN = "MgEKfXLr4l4EbSdju9Mc1U2rnFe"
OUTPUT_DIR = "./data/memo"


def get_access_token():
    res = requests.post(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        json={"app_id": APP_ID, "app_secret": APP_SECRET}
    )
    data = res.json()
    if "tenant_access_token" not in data:
        raise Exception(f"Token获取失败：{data}")
    return data["tenant_access_token"]


def list_folder_contents(folder_token, token):
    """列出文件夹内所有文件和子文件夹"""
    url = "https://open.feishu.cn/open-apis/drive/v1/files"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"folder_token": folder_token, "page_size": 50}
    res = requests.get(url, headers=headers, params=params)
    data = res.json()
    if data.get("code") != 0:
        print(f"  ✗ 列出文件夹失败：{data}")
        return []
    return data.get("data", {}).get("files", [])


def export_doc_to_markdown(file_token, file_type, token):
    """导出为docx，直接在内存中转成markdown，不保存中间文件"""
    if file_type not in ["docx", "doc"]:
        return None

    # 发起导出任务
    export_url = "https://open.feishu.cn/open-apis/drive/v1/export_tasks"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    body = {
        "file_extension": "docx",
        "token": file_token,
        "type": file_type
    }
    res = requests.post(export_url, headers=headers, json=body)
    data = res.json()
    task_id = data.get("data", {}).get("ticket")

    if not task_id:
        print(f"  ✗ 导出任务创建失败：{data}")
        return None

    # 轮询任务状态（最多等20秒）
    download_token = None
    for _ in range(10):
        time.sleep(2)
        status_res = requests.get(
            f"https://open.feishu.cn/open-apis/drive/v1/export_tasks/{task_id}",
            headers=headers,
            params={"token": file_token}
        )
        result = status_res.json().get("data", {}).get("result", {})
        if result.get("job_status") == 0:
            download_token = result.get("file_token")
            break
        elif result.get("job_status") in [2, 3]:  # 失败状态
            print(f"  ✗ 导出任务失败：{result}")
            return None

    if not download_token:
        print("  ✗ 导出超时")
        return None

    # 下载docx（二进制流）
    dl_res = requests.get(
        f"https://open.feishu.cn/open-apis/drive/v1/medias/{download_token}/download",
        headers=headers
    )

    if dl_res.status_code != 200:
        print(f"  ✗ 下载失败，状态码：{dl_res.status_code}")
        return None

    # 在内存中把docx转成markdown纯文本
    try:
        docx_bytes = io.BytesIO(dl_res.content)
        doc = DocxDocument(docx_bytes)
        md_lines = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if not text:
                continue
            # 根据段落样式加markdown标题符号
            style = para.style.name if para.style else ""
            if style.startswith("Heading 1"):
                md_lines.append(f"# {text}")
            elif style.startswith("Heading 2"):
                md_lines.append(f"## {text}")
            elif style.startswith("Heading 3"):
                md_lines.append(f"### {text}")
            else:
                md_lines.append(text)
        return "\n\n".join(md_lines)
    except Exception as e:
        print(f"  ✗ docx转md失败：{e}")
        return None


def sanitize_filename(name):
    """清理文件名中的非法字符"""
    return re.sub(r'[\\/*?:"<>|]', "_", name)


def process_folder(folder_token, token, local_path):
    """递归处理文件夹及所有子文件夹"""
    os.makedirs(local_path, exist_ok=True)
    items = list_folder_contents(folder_token, token)

    if not items:
        print(f"  （文件夹为空或无权限）")
        return

    for item in items:
        name = item.get("name", "unnamed")
        item_type = item.get("type")
        item_token = item.get("token")
        safe_name = sanitize_filename(name)

        if item_type == "folder":
            print(f"\n📁 进入子文件夹：{name}")
            process_folder(item_token, token, os.path.join(local_path, safe_name))

        elif item_type in ["docx", "doc"]:
            print(f"  📄 处理文档：{name}")
            md_content = export_doc_to_markdown(item_token, item_type, token)
            if md_content:
                out_path = os.path.join(local_path, f"{safe_name}.md")
                with open(out_path, "w", encoding="utf-8") as f:
                    f.write(md_content)
                print(f"  ✓ 已保存：{out_path}")
            time.sleep(1)  # 避免触发限流

        else:
            print(f"  ⟳ 跳过（类型 {item_type}）：{name}")


if __name__ == "__main__":
    print("获取访问Token...")
    token = get_access_token()
    print(f"✓ Token获取成功\n")
    print(f"开始遍历云盘文件夹...\n")
    process_folder(ROOT_FOLDER_TOKEN, token, OUTPUT_DIR)
    print(f"\n✅ 全部完成！文件已保存到 {OUTPUT_DIR}")