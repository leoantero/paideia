-- O vínculo pai-aluno deixa de ser feito por código compartilhado. No modelo
-- B2B a escola matricula o aluno e o vínculo é criado a partir do e-mail do
-- responsável informado na matrícula (seed/serviço server-side), nunca por um
-- código que o aluno digita. Ver docs/MVP_SPEC.md.
--
-- A coluna students.linking_code e o trigger que a preenche ficam por ora
-- (dormentes, sem uso) para não quebrar handle_new_user(); serão removidos
-- quando o cadastro de aluno migrar para o fluxo de matrícula da escola.

drop function if exists link_student_by_code(text);
