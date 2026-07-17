export const initTextEditorWindow = (windowEl, findExplorerNodeById, refreshExplorerWindows) => {
  if (!windowEl) return;
  const saveBtn = windowEl.querySelector('button[data-action="save"]');
  const area = windowEl.querySelector('.text-editor');

  saveBtn && saveBtn.addEventListener('click', () => {
    const fileId = windowEl.dataset.editorFileId;
    if (!fileId) return;
    const node = typeof findExplorerNodeById === 'function' ? findExplorerNodeById(fileId) : null;
    if (!node) return;
    node.content = area ? area.value : node.content;
    if (typeof refreshExplorerWindows === 'function') {
      refreshExplorerWindows();
    }
  });

  if (area) {
    area.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveBtn && saveBtn.click();
      }
    });
  }
};
