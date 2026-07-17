export const initTextEditorWindow = (windowEl, findExplorerNodeById, refreshExplorerWindows, createNewTextFileOnDesktop) => {
  if (!windowEl) return;
  const saveBtn = windowEl.querySelector('button[data-action="save"]');
  const area = windowEl.querySelector('.text-editor');

  const updateWindowFileMeta = (node) => {
    if (!node) return;
    windowEl.dataset.editorFileId = node.id;
    const title = windowEl.querySelector('.finder-title');
    if (title) title.textContent = node.name || 'Untitled';
    const path = windowEl.querySelector('.editor-path');
    if (path) path.textContent = `${node.name}`;
  };

  saveBtn && saveBtn.addEventListener('click', () => {
    let fileId = windowEl.dataset.editorFileId;
    let node = typeof findExplorerNodeById === 'function' ? findExplorerNodeById(fileId) : null;

    if (!node && typeof createNewTextFileOnDesktop === 'function') {
      node = createNewTextFileOnDesktop();
      if (node) {
        updateWindowFileMeta(node);
        fileId = node.id;
      }
    }

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
