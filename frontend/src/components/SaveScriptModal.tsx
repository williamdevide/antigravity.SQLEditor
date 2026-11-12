import React, { useState, useEffect } from 'react';
import type { UserProfile, SavedScriptCategory, ClassItem, UserRole } from '../types';
import { saveScript, formatScriptFileName } from '../services/scriptService';

interface SaveScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTabTitle: string;
  activeTabContent: string;
  user: any;
  userProfile: UserProfile | null;
  teacherClasses: ClassItem[];
  currentClassId?: string;
  isExamModeActive?: boolean;
  onSaveSuccess: (savedScript: any) => void;
}

export const SaveScriptModal: React.FC<SaveScriptModalProps> = ({
  isOpen,
  onClose,
  activeTabTitle,
  activeTabContent,
  user,
  userProfile,
  teacherClasses,
  currentClassId,
  isExamModeActive = false,
  onSaveSuccess,
}) => {
  const isTeacherOrAdmin = userProfile?.role === 'professor' || userProfile?.role === 'admin';

  const [title, setTitle] = useState(activeTabTitle || '');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SavedScriptCategory>(
    isTeacherOrAdmin ? 'example' : 'student_saved'
  );
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(['all']);
  const [isAllClasses, setIsAllClasses] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(activeTabTitle || 'Meu Script SQL');
      setDescription('');
      setCategory(
        isExamModeActive
          ? 'exam'
          : isTeacherOrAdmin
          ? 'example'
          : 'student_saved'
      );
      if (currentClassId) {
        setSelectedClassIds([currentClassId]);
        setIsAllClasses(false);
      } else {
        setSelectedClassIds(['all']);
        setIsAllClasses(true);
      }
      setErrorMessage(null);
    }
  }, [isOpen, activeTabTitle, isTeacherOrAdmin, isExamModeActive, currentClassId]);

  if (!isOpen) return null;

  const handleToggleClass = (classId: string) => {
    if (isAllClasses) {
      setIsAllClasses(false);
      setSelectedClassIds([classId]);
      return;
    }
    setSelectedClassIds((prev) => {
      if (prev.includes(classId)) {
        const next = prev.filter((id) => id !== classId);
        if (next.length === 0) {
          setIsAllClasses(true);
          return ['all'];
        }
        return next;
      }
      return [...prev, classId];
    });
  };

  const handleToggleAllClasses = () => {
    if (isAllClasses) {
      setIsAllClasses(false);
      setSelectedClassIds(teacherClasses.length > 0 ? [teacherClasses[0].id] : []);
    } else {
      setIsAllClasses(true);
      setSelectedClassIds(['all']);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage('Você precisa estar conectado para salvar scripts no seu perfil.');
      return;
    }
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Por favor, informe um título para o script.');
      return;
    }

    try {
      setIsSaving(true);
      const finalCategory: SavedScriptCategory = isTeacherOrAdmin
        ? category
        : 'student_saved';

      const finalClassIds = isAllClasses
        ? ['all']
        : selectedClassIds.length > 0
        ? selectedClassIds
        : (currentClassId ? [currentClassId] : ['all']);

      const authorName = userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Usuário';
      const authorEmail = userProfile?.email || user.email || '';
      const authorRole: UserRole = userProfile?.role || 'aluno';

      // Formata automaticamente o título para nome de arquivo .sql em formato kebab-case
      // (ex: 'teste' -> 'teste.sql', 'meu teste' -> 'meu-teste.sql')
      const formattedTitle = formatScriptFileName(title);

      const saved = await saveScript({
        title: formattedTitle,
        description: description.trim(),
        content: activeTabContent,
        authorUid: user.uid,
        authorName,
        authorEmail,
        authorRole,
        category: finalCategory,
        classIds: finalClassIds,
        isTemporary: false,
      });

      onSaveSuccess(saved);
      onClose();
    } catch (err: any) {
      console.error('[SaveScriptModal Error]', err);
      setErrorMessage('Erro ao salvar script: ' + (err?.message || 'Tente novamente.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/50">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[20px] text-[var(--accent-yellow)]">
              save
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Salvar Guia no Perfil
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {isTeacherOrAdmin
                  ? 'Publique o script para seus alunos ou salve para uso pedagógico'
                  : 'Seu script ficará armazenado na nuvem e acessível em qualquer dispositivo'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-7 h-7 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-500 text-xs flex items-center gap-2 animate-in shake duration-150">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Título */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">
                Título do Script <span className="text-red-400">*</span>
              </label>
              {title.trim() && (
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  Salvará como: <strong className="text-[var(--accent-yellow)]">{formatScriptFileName(title)}</strong>
                </span>
              )}
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: teste ou meu teste"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Descrição / Observações (opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Resolução de INNER JOIN com tabelas clientes e pedidos..."
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#FF6B00] transition-colors resize-none"
            />
          </div>

          {/* Opções Avançadas do Professor/Admin */}
          {isTeacherOrAdmin && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FF6B00]">
                <span className="material-symbols-outlined text-[16px]">school</span>
                <span>Configurações Pedagógicas do Docente</span>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1.5">
                  Finalidade do Script
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      category === 'student_saved'
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scriptCategory"
                      value="student_saved"
                      checked={category === 'student_saved'}
                      onChange={() => setCategory('student_saved')}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[16px] text-[#FF6B00]">
                      bookmark
                    </span>
                    <span className="text-[11px]">Rascunho Pessoal</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      category === 'class_database'
                        ? 'border-[var(--status-success)] bg-[var(--status-success)]/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scriptCategory"
                      value="class_database"
                      checked={category === 'class_database'}
                      onChange={() => setCategory('class_database')}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[16px] text-[var(--status-success)]">
                      database
                    </span>
                    <span className="text-[11px]">BD Sala de Aula</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      category === 'example'
                        ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scriptCategory"
                      value="example"
                      checked={category === 'example'}
                      onChange={() => setCategory('example')}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[16px] text-[#00E5FF]">
                      lightbulb
                    </span>
                    <span className="text-[11px]">Exemplo de Aula</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      category === 'exercise'
                        ? 'border-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scriptCategory"
                      value="exercise"
                      checked={category === 'exercise'}
                      onChange={() => setCategory('exercise')}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[16px] text-[var(--accent-yellow)]">
                      assignment
                    </span>
                    <span className="text-[11px]">Exercício Prático</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      category === 'exam'
                        ? 'border-purple-500 bg-purple-500/10 text-[var(--text-primary)] font-bold'
                        : 'border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="scriptCategory"
                      value="exam"
                      checked={category === 'exam'}
                      onChange={() => setCategory('exam')}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[16px] text-purple-400">
                      quiz
                    </span>
                    <span className="text-[11px]">Avaliação / Prova</span>
                  </label>
                </div>
              </div>

              {/* Vinculação com Turmas */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Disponibilizar para quais turmas?
                  </label>
                  <button
                    type="button"
                    onClick={handleToggleAllClasses}
                    className="text-[10px] text-[#FF6B00] hover:underline cursor-pointer"
                  >
                    {isAllClasses ? 'Selecionar específicas' : 'Selecionar todas'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                  <label className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllClasses}
                      onChange={handleToggleAllClasses}
                      className="rounded border-[var(--border-color)] accent-[#FF6B00]"
                    />
                    <span className="font-semibold text-[var(--text-primary)]">
                      🌐 Todas as minhas turmas
                    </span>
                  </label>

                  {!isAllClasses &&
                    teacherClasses.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassIds.includes(c.id)}
                          onChange={() => handleToggleClass(c.id)}
                          className="rounded border-[var(--border-color)] accent-[#FF6B00]"
                        />
                        <span className="text-[var(--text-primary)] truncate">
                          {c.name}{' '}
                          <span className="text-[var(--text-muted)] font-mono text-[10px]">
                            [{c.code}]
                          </span>
                        </span>
                      </label>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Rodapé e Ações */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#FF6B00] to-[#FF8800] text-black font-bold text-xs shadow hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Salvar no Perfil</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

