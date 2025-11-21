import { NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("file").filter(Boolean) as File[];
    if (!files.length) {
      return NextResponse.json({ error: "未上传文件" }, { status: 400 });
    }
    const uploadDir = join(process.cwd(), "public", "uploads");
    mkdirSync(uploadDir, { recursive: true });
    const urls: string[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = file.name.split(".").pop() || "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filepath = join(uploadDir, filename);
      writeFileSync(filepath, buffer);
      urls.push(`/uploads/${filename}`);
    }
    return NextResponse.json({ success: true, urls, url: urls[0] }); // 同时返回 urls 数组和第一个 url（兼容旧代码）
  } catch (error) {
    console.error("图片上传错误:", error || "未知错误");
    return NextResponse.json({ error: "上传失败" }, { status: 500 });
  }
} 