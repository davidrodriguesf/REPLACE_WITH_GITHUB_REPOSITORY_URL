"use client";

import { useActionState } from "react";
import { saveLesson } from "../actions";
import { FormMessage, SubmitButton } from "@/components/ui";
import type { Lesson, Module } from "@/lib/types";

export function LessonForm({ courseId, modules, lesson, moduleId }: { courseId: string; modules: Module[]; lesson?: Lesson; moduleId?: string }) {
  const [state, action] = useActionState(saveLesson, undefined);
  return (
    <form action={action} className="space-y-4">
      {lesson && <input type="hidden" name="id" value={lesson.id} />}
      <input type="hidden" name="course_id" value={courseId} />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px_100px]">
        <div>
          <label className="label">Título da aula *</label>
          <input className="input" name="title" defaultValue={lesson?.title} required />
        </div>
        <div>
          <label className="label">Módulo</label>
          <select className="input" name="module_id" defaultValue={lesson?.module_id ?? moduleId}>
            {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Ordem</label>
          <input className="input" name="position" type="number" defaultValue={lesson?.position ?? 0} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div>
          <label className="label">Link do vídeo (YouTube, Vimeo, Panda, Bunny...)</label>
          <input className="input" name="video_url" type="url" defaultValue={lesson?.video_url ?? ""} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Duração (min)</label>
          <input className="input" name="duration_minutes" type="number" min={0} defaultValue={lesson?.duration_minutes ?? ""} />
        </div>
      </div>
      <div>
        <label className="label">Resumo</label>
        <input className="input" name="description" defaultValue={lesson?.description ?? ""} />
      </div>
      <div>
        <label className="label">Conteúdo / texto de apoio</label>
        <textarea className="input min-h-40" name="content" defaultValue={lesson?.content ?? ""} />
      </div>
      <div>
        <label className="label">Link do material complementar (PDF, planilha...)</label>
        <input className="input" name="attachment_url" type="url" defaultValue={lesson?.attachment_url ?? ""} placeholder="https://..." />
      </div>
      <FormMessage state={state} />
      <SubmitButton>{lesson ? "Salvar aula" : "Adicionar aula"}</SubmitButton>
    </form>
  );
}
