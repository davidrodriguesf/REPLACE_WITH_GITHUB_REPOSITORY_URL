import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Arquivos enviados pelos formulários (capas, PDFs, fotos, logo, assinatura).
 * Ficam no disco da VPS (UPLOAD_DIR, padrão /opt/academia/arquivos no instalador)
 * e são servidos pelo próprio app em /arquivos/<pasta>/<uuid>.<ext>.
 */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

export type UploadKind = "image" | "pdf" | "doc";
const MB = 1024 * 1024;
const LIMIT: Record<UploadKind, number> = { image: 8 * MB, pdf: 50 * MB, doc: 50 * MB };

export const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif", pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const PUBLIC_EXT = new Set(["png", "jpg", "webp", "gif"]);

/** Descobre o tipo pelo conteúdo (não confia na extensão nem no navegador). */
function sniff(buf: Buffer, name: string): string | null {
  const hex = buf.subarray(0, 12).toString("hex");
  if (hex.startsWith("89504e470d0a1a0a")) return "png";
  if (hex.startsWith("ffd8ff")) return "jpg";
  if (hex.startsWith("47494638")) return "gif";
  if (hex.startsWith("52494646") && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  if (hex.startsWith("504b0304")) {
    const ext = name.toLowerCase().split(".").pop() || "";
    if (["docx", "xlsx", "pptx"].includes(ext)) return ext;
  }
  return null;
}

const ACCEPT: Record<UploadKind, string[]> = {
  image: ["png", "jpg", "webp", "gif"],
  pdf: ["pdf"],
  doc: ["pdf", "docx", "xlsx", "pptx"],
};
const KIND_LABEL: Record<UploadKind, string> = {
  image: "uma imagem PNG, JPG ou WEBP",
  pdf: "um arquivo PDF",
  doc: "um PDF (ou Word, Excel, PowerPoint)",
};

export class UploadError extends Error {}

export async function saveUpload(file: File, kind: UploadKind, folder: string) {
  if (file.size > LIMIT[kind]) throw new UploadError(`O arquivo "${file.name}" passa de ${LIMIT[kind] / MB} MB.`);
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = sniff(buf, file.name);
  if (!ext || !ACCEPT[kind].includes(ext)) throw new UploadError(`"${file.name}" não é ${KIND_LABEL[kind]}.`);
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "geral";
  const dir = path.join(UPLOAD_ROOT, safeFolder);
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), buf, { mode: 0o640 });
  return `/arquivos/${safeFolder}/${name}`;
}

/**
 * Lê um campo de arquivo do formulário (componente <FileField>):
 * arquivo novo → salva e devolve o endereço; "remover" marcado → null; senão mantém o atual.
 */
export async function fileField(form: FormData, name: string, kind: UploadKind, folder: string): Promise<string | null> {
  const f = form.get(name);
  if (f && typeof f === "object" && "size" in f && f.size > 0) return saveUpload(f as File, kind, folder);
  if (form.get(`${name}__remove`) === "on") return null;
  const cur = form.get(`${name}__current`);
  return typeof cur === "string" && cur ? cur : null;
}
