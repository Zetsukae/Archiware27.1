const explorerRootNode = {
  id: 'root',
  name: 'Disk C',
  type: 'folder',
  children: [
    {
      id: 'documents',
      name: 'Documents',
      type: 'folder',
      children: [
        { id: 'notes', name: 'Notes.txt', type: 'file', icon: '📄', content: 'These are your notes.\n\n- Item 1\n- Item 2\n' },
        { id: 'resume', name: 'Resume.pdf', type: 'file', icon: '📄' },
        {
          id: 'icons',
          name: 'Icons',
          type: 'folder',
          children: [
            { id: 'about-icon', name: 'about.svg', type: 'file', icon: '🖼️' },
            { id: 'app-icon', name: 'app.svg', type: 'file', icon: '🖼️' },
            { id: 'browser-icon', name: 'browser.svg', type: 'file', icon: '🖼️' },
            { id: 'customize-icon', name: 'customize.svg', type: 'file', icon: '🖼️' },
            { id: 'explorer-icon', name: 'explorer.svg', type: 'file', icon: '🖼️' },
            { id: 'general-icon', name: 'general.svg', type: 'file', icon: '🖼️' },
            { id: 'music-icon', name: 'music.svg', type: 'file', icon: '🖼️' },
            { id: 'settings-icon', name: 'settings.svg', type: 'file', icon: '🖼️' },
            { id: 'text-icon', name: 'text.svg', type: 'file', icon: '🖼️' },
            { id: 'texteditor-icon', name: 'textEditor.svg', type: 'file', icon: '🖼️' },
            { id: 'license-icons', name: 'LICENSE-ICONS.md', type: 'file', icon: '📄', content: '========================================================\n        ARCHIWARE OS - ICONS & VISUAL ASSETS\n========================================================\nCopyright © 2026 Zetsukae. All Rights Reserved.\n\nAll custom icons, brand assets, and logos created for \nArchiwareOS are proprietary and are strictly excluded \nfrom the GNU General Public License v3.0 applied to \nthe software\'s code.\n\nTERMS OF USE:\n- You are NOT allowed to copy, redistribute, modify, \n  sub-license, or reuse these icons in any other project \n  or derivative work without explicit written permission.\n- Any fork, modification, or derivative version of \n  ArchiwareOS MUST completely remove or replace these \n  visual assets.\n========================================================' }
          ]
        },
        { id: 'work', name: 'Work', type: 'folder', children: [
          { id: 'roadmap', name: 'Roadmap.md', type: 'file', icon: '📄', content: '# Roadmap\nWork files here.' },
          { id: 'brief', name: 'Brief.docx', type: 'file', icon: '📄' }
        ] }
      ]
    },
    {
      id: 'downloads',
      name: 'Downloads',
      type: 'folder',
      children: [
        { id: 'archive', name: 'archive.zip', type: 'file', icon: '⬇️' },
        { id: 'readme', name: 'Readme.md', type: 'file', icon: '📄', content: '# Archiware\nThis is a sample README for the Archiware project.' }
      ]
    },
    {
      id: 'desktop',
      name: 'Desktop',
      type: 'folder',
      children: [
        { id: 'projects', name: 'Projects', type: 'folder', children: [
          { id: 'archiware', name: 'Archiware', type: 'folder', children: [
            { id: 'readme', name: 'README.md', type: 'file', icon: '📄', content: '# Archiware\nProject files go here.' }
          ] }
        ] }
      ]
    }
  ]
};

const escapeExplorerText = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const getExplorerNodeBySegments = (segments) => {
  let current = explorerRootNode;
  segments.forEach((segmentId) => {
    if (!current || current.type !== 'folder') return;
    const child = current.children.find((entry) => entry.id === segmentId);
    if (!child || child.type !== 'folder') return;
    current = child;
  });
  return current;
};

export const findExplorerNodePathByName = (name, currentNode = explorerRootNode, segments = []) => {
  if (!name || !currentNode || currentNode.type !== 'folder') return null;
  const targetName = String(name).trim().toLowerCase();
  if (currentNode.name.toLowerCase() === targetName) {
    return segments;
  }
  for (const child of currentNode.children || []) {
    if (child.type !== 'folder') continue;
    const childPath = findExplorerNodePathByName(name, child, [...segments, child.id]);
    if (childPath) return childPath;
  }
  return null;
};

export const getExplorerDesktopNode = () => {
  return explorerRootNode.children.find((entry) => entry.id === 'desktop') || null;
};

export const findExplorerNodeById = (nodeId, currentNode = explorerRootNode) => {
  if (!nodeId) return null;
  if (currentNode.id === nodeId) return currentNode;
  for (const child of currentNode.children || []) {
    if (child.id === nodeId) return child;
    const nested = findExplorerNodeById(nodeId, child);
    if (nested) return nested;
  }
  return null;
};

export const getExplorerSegments = (windowEl) => {
  const raw = windowEl?.dataset?.explorerPath || '';
  return raw.split('/').filter(Boolean);
};

export const getExplorerNodeForWindow = (windowEl) => {
  return getExplorerNodeBySegments(getExplorerSegments(windowEl));
};

export const getExplorerPathLabel = (windowEl) => {
  const segments = getExplorerSegments(windowEl);
  const names = [];
  let current = explorerRootNode;
  segments.forEach((segmentId) => {
    if (!current || current.type !== 'folder') return;
    const child = current.children.find((entry) => entry.id === segmentId);
    if (!child || child.type !== 'folder') return;
    names.push(child.name);
    current = child;
  });
  const base = 'C:/sda1';
  return names.length ? `${base}/${names.join('/')}/` : `${base}/`;
};

export const getExplorerPathTitle = (windowEl) => {
  const node = getExplorerNodeForWindow(windowEl);
  return node?.name || 'Disk C';
};

const buildUniqueName = (currentNode, baseName, currentId = null) => {
  const trimmedBase = (baseName || 'New Item').trim() || 'New Item';
  const names = (currentNode?.children || [])
    .filter((entry) => entry.id !== currentId)
    .map((entry) => entry.name.toLowerCase());
  
  if (!names.includes(trimmedBase.toLowerCase())) return trimmedBase;
  
  // Extract extension if present
  const lastDotIndex = trimmedBase.lastIndexOf('.');
  let nameWithoutExt = trimmedBase;
  let ext = '';
  
  if (lastDotIndex > 0 && lastDotIndex < trimmedBase.length - 1) {
    nameWithoutExt = trimmedBase.slice(0, lastDotIndex);
    ext = trimmedBase.slice(lastDotIndex);
  }
  
  let suffix = 2;
  let candidate = `${nameWithoutExt} ${suffix}${ext}`;
  while (names.includes(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${nameWithoutExt} ${suffix}${ext}`;
  }
  return candidate;
};

export const buildUniqueExplorerFolderName = (currentNode, baseName = 'New Folder') => {
  return buildUniqueName(currentNode, baseName);
};

export const buildUniqueExplorerItemName = (currentNode, baseName = 'New Item', currentId = null) => {
  return buildUniqueName(currentNode, baseName, currentId);
};

const syncDesktopFolderFromExplorerNode = (node) => {
  if (!node) return;
  const matchingFolders = document.querySelectorAll(`.desktop-folder[data-explorer-node-id="${node.id}"]`);
  matchingFolders.forEach((folderEl) => {
    folderEl.dataset.folderName = node.name;
    folderEl.setAttribute('aria-label', node.name);
    const labelEl = folderEl.querySelector('.desktop-folder__name');
    if (labelEl) {
      labelEl.textContent = node.name;
    }
  });
};

const syncExplorerSidebarSelection = (windowEl) => {
  if (!windowEl) return;
  const segments = getExplorerSegments(windowEl);
  const activeFolderId = !segments.length
    ? 'root'
    : (segments[0] === 'documents' || segments[0] === 'downloads' || segments[0] === 'desktop'
      ? segments[0]
      : 'root');
  windowEl.querySelectorAll('.finder-sidebar li').forEach((item) => {
    item.classList.toggle('active', (item.dataset.folderId || 'root') === activeFolderId);
  });
};

export const renderExplorerWindow = (windowEl, showContextMenu, openTextEditorWindow) => {
  if (!windowEl) return;
  const titleEl = windowEl.querySelector('.finder-title');
  const pathEl = windowEl.querySelector('.path-bar');
  const gridEl = windowEl.querySelector('.file-grid');
  const searchInput = windowEl.querySelector('.finder-search');
  const currentNode = getExplorerNodeForWindow(windowEl);
  const searchQuery = (windowEl.dataset.explorerSearch || '').trim().toLowerCase();

  if (titleEl) titleEl.textContent = getExplorerPathTitle(windowEl);
  if (pathEl) pathEl.textContent = getExplorerPathLabel(windowEl);

  if (gridEl) {
    gridEl.innerHTML = '';
    const collectMatches = (node) => {
      let out = [];
      for (const child of node.children || []) {
        if (child.name && child.name.toLowerCase().includes(searchQuery)) out.push(child);
        if (child.type === 'folder') out = out.concat(collectMatches(child));
      }
      return out;
    };

    const visibleChildren = searchQuery ? collectMatches(explorerRootNode) : (currentNode?.children || []);

    if (!visibleChildren.length) {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'file-card is-empty';
      emptyCard.innerHTML = '<div class="file-icon">📂</div><div class="file-name">No items</div>';
      gridEl.appendChild(emptyCard);
      return;
    }

    const getExplorerSelectableCards = () => Array.from(gridEl.querySelectorAll('.file-card')).filter((item) => !item.classList.contains('is-empty'));

    const selectExplorerCard = (targetCard, event) => {
      const cards = getExplorerSelectableCards();
      const targetIndex = cards.indexOf(targetCard);
      if (targetIndex < 0) return;

      const lastSelectedId = windowEl.dataset.explorerLastSelectedCardId;
      const lastSelectedCard = lastSelectedId ? cards.find((card) => card.dataset.nodeId === lastSelectedId) : null;
      const isRangeSelection = event.shiftKey && lastSelectedCard;
      const isAdditiveSelection = event.metaKey || event.ctrlKey;

      if (isRangeSelection) {
        const anchorIndex = cards.indexOf(lastSelectedCard);
        const start = Math.min(anchorIndex, targetIndex);
        const end = Math.max(anchorIndex, targetIndex);
        cards.forEach((card, index) => {
          card.classList.toggle('is-selected', index >= start && index <= end);
        });
      } else if (isAdditiveSelection) {
        targetCard.classList.toggle('is-selected');
      } else {
        cards.forEach((card) => card.classList.remove('is-selected'));
        targetCard.classList.add('is-selected');
      }

      windowEl.dataset.explorerLastSelectedCardId = targetCard.dataset.nodeId;
    };

    visibleChildren.forEach((entry) => {
      const card = document.createElement('div');
      card.className = 'file-card';
      card.dataset.nodeId = entry.id;
      card.dataset.nodeType = entry.type;
      card.dataset.nodeName = entry.name;

      if (entry.type === 'folder') card.classList.add('is-folder');

      const isTextOrPdfFile = entry.type === 'file' && /\.(txt|md|markdown|pdf)$/i.test(entry.name || '');
      const isSvgFile = entry.type === 'file' && /\.svg$/i.test(entry.name || '');
      const iconHtml = entry.type === 'folder'
        ? '<img src="../public/icons/explorer.svg" alt="Folder" />'
        : isSvgFile
          ? `<img src="../public/icons/${escapeExplorerText(entry.name)}" alt="${escapeExplorerText(entry.name)}" />`
          : isTextOrPdfFile
            ? '<img src="../public/icons/text.svg" alt="Document file" />'
            : (entry.icon ? escapeExplorerText(entry.icon) : '📄');

      const isRenaming = windowEl.dataset.explorerRenameNodeId === entry.id;
      if (isRenaming) {
        card.classList.add('is-renaming');
        const renameInput = document.createElement('input');
        renameInput.className = 'explorer-rename-input';
        renameInput.value = entry.name;
        renameInput.setAttribute('aria-label', `Rename ${entry.name}`);
        card.appendChild(renameInput);
        renameInput.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            renameExplorerItemInWindow(windowEl, entry.id, renameInput.value, showContextMenu, openTextEditorWindow);
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            delete windowEl.dataset.explorerRenameNodeId;
            renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
          }
        });
        renameInput.addEventListener('blur', () => {
          renameExplorerItemInWindow(windowEl, entry.id, renameInput.value, showContextMenu, openTextEditorWindow);
        });
        requestAnimationFrame(() => renameInput.focus());
      } else {
        card.innerHTML = `<div class="file-icon">${iconHtml}</div><div class="file-name">${escapeExplorerText(entry.name)}</div>`;
      }

      card.addEventListener('click', (event) => {
        if (windowEl.dataset.explorerRenameNodeId === entry.id) return;
        event.stopPropagation();
        selectExplorerCard(card, event);
      });

      card.addEventListener('dblclick', (event) => {
        event.stopPropagation();
        if (entry.type === 'folder') {
          navigateExplorerWindow(windowEl, [...getExplorerSegments(windowEl), entry.id], { pushHistory: true }, showContextMenu, openTextEditorWindow);
          return;
        }
        const name = (entry.name || '').toLowerCase();
        if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown')) {
          const node = findExplorerNodeById(entry.id);
          openTextEditorWindow(node);
          return;
        }
        if (name.endsWith('.svg')) {
          const browserUrl = `../public/icons/${escapeExplorerText(entry.name)}`;
          openBrowserWindow(browserUrl);
        }
      });

      card.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        let items = [];
        if (entry.type === 'folder') {
          items = [
            { label: 'Open', action: () => navigateExplorerWindow(windowEl, [...getExplorerSegments(windowEl), entry.id], { pushHistory: true }, showContextMenu, openTextEditorWindow) },
            { label: 'Rename', action: () => { windowEl.dataset.explorerRenameNodeId = entry.id; renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow); } },
            { label: 'New Folder', action: () => createExplorerFolderInWindow(windowEl, 'New Folder', showContextMenu, openTextEditorWindow) },
            { type: 'divider' },
            { label: 'Delete', action: () => { const current = getExplorerNodeForWindow(windowEl); current.children = current.children.filter((child) => child.id !== entry.id); renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow); } }
          ];
        } else {
          const name = (entry.name || '').toLowerCase();
          const isText = name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.markdown');
          const isSvg = name.endsWith('.svg');
          if (isText) {
            items.push({ label: 'Open', action: () => { const node = findExplorerNodeById(entry.id); openTextEditorWindow(node); } });
          } else if (isSvg) {
            items.push({ label: 'Open', action: () => { openBrowserWindow(`../public/icons/${escapeExplorerText(entry.name)}`); } });
          }
          items = items.concat([
            { label: 'Rename', action: () => { windowEl.dataset.explorerRenameNodeId = entry.id; renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow); } },
            { label: 'New Folder', action: () => createExplorerFolderInWindow(windowEl, 'New Folder', showContextMenu, openTextEditorWindow) },
            { type: 'divider' },
            { label: 'Delete', action: () => { const current = getExplorerNodeForWindow(windowEl); current.children = current.children.filter((child) => child.id !== entry.id); renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow); } }
          ]);
        }
        showContextMenu(event.clientX, event.clientY, items);
      });

      gridEl.appendChild(card);
    });
  }

  if (searchInput) {
    searchInput.value = windowEl.dataset.explorerSearch || '';
  }

  syncExplorerSidebarSelection(windowEl);
};

export const initExplorerWindow = (windowEl, showContextMenu, openTextEditorWindow) => {
  if (!windowEl) return;
  const backBtn = windowEl.querySelector('.finder-navigation button[aria-label="Previous"]');
  const nextBtn = windowEl.querySelector('.finder-navigation button[aria-label="Next"]');
  const mainEl = windowEl.querySelector('.finder-main');
  const searchInput = windowEl.querySelector('.finder-search');
  let marqueeEl = null;
  let startPoint = null;
  let currentPoint = null;
  let isSelecting = false;
  let suppressNextEmptyClick = false;

  const getExplorerPoint = (clientX, clientY) => {
    const rect = mainEl?.getBoundingClientRect();
    if (!rect) return { x: clientX, y: clientY };
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const clearExplorerSelection = () => {
    windowEl.querySelectorAll('.file-card.is-selected').forEach((card) => card.classList.remove('is-selected'));
  };

  const selectExplorerCardsInRect = (rect) => {
    clearExplorerSelection();
    const selected = [];
    windowEl.querySelectorAll('.file-card').forEach((card) => {
      if (card.classList.contains('is-empty')) return;
      const cardRect = card.getBoundingClientRect();
      const centerX = cardRect.left + cardRect.width / 2;
      const centerY = cardRect.top + cardRect.height / 2;
      const intersects = centerX >= rect.left && centerX <= rect.left + rect.width && centerY >= rect.top && centerY <= rect.top + rect.height;
      if (intersects) {
        card.classList.add('is-selected');
        selected.push(card);
      }
    });
    if (selected.length > 0) {
      windowEl.dataset.selectionCount = String(selected.length);
    } else {
      delete windowEl.dataset.selectionCount;
    }
  };

  const createExplorerMarquee = (x, y) => {
    if (!mainEl) return;
    marqueeEl = document.createElement('div');
    marqueeEl.id = 'marquee';
    marqueeEl.style.left = `${x}px`;
    marqueeEl.style.top = `${y}px`;
    marqueeEl.style.width = '0px';
    marqueeEl.style.height = '0px';
    mainEl.appendChild(marqueeEl);
  };

  const removeExplorerMarquee = () => {
    if (marqueeEl?.parentNode) {
      marqueeEl.parentNode.removeChild(marqueeEl);
    }
    marqueeEl = null;
  };

  const onExplorerSelectionMove = (event) => {
    if (!isSelecting || !marqueeEl || !startPoint || !mainEl) return;
    currentPoint = getExplorerPoint(event.clientX, event.clientY);
    const left = Math.min(currentPoint.x, startPoint.x);
    const top = Math.min(currentPoint.y, startPoint.y);
    const width = Math.max(1, Math.abs(currentPoint.x - startPoint.x));
    const height = Math.max(1, Math.abs(currentPoint.y - startPoint.y));
    marqueeEl.style.left = `${left}px`;
    marqueeEl.style.top = `${top}px`;
    marqueeEl.style.width = `${width}px`;
    marqueeEl.style.height = `${height}px`;
  };

  const onExplorerSelectionUp = () => {
    if (!isSelecting) return;
    isSelecting = false;
    if (!marqueeEl) return;
    const rect = marqueeEl.getBoundingClientRect();
    const surfaceRect = mainEl?.getBoundingClientRect();
    if (surfaceRect) {
      const normalizedRect = {
        left: rect.left - surfaceRect.left,
        top: rect.top - surfaceRect.top,
        width: rect.width,
        height: rect.height
      };
      removeExplorerMarquee();
      if (normalizedRect.width > 4 && normalizedRect.height > 4) {
        selectExplorerCardsInRect(normalizedRect);
      }
    } else {
      removeExplorerMarquee();
    }
    startPoint = null;
    currentPoint = null;
    requestAnimationFrame(() => {
      suppressNextEmptyClick = false;
    });
  };

  if (!windowEl.dataset.explorerPath) {
    windowEl.dataset.explorerPath = '';
    windowEl.dataset.explorerHistory = '[]';
    windowEl.dataset.explorerHistoryIndex = '0';
  }

  if (backBtn) {
    backBtn.addEventListener('click', (event) => {
      event.preventDefault();
      goBackExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
      setTimeout(() => backBtn.blur(), 0);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (event) => {
      event.preventDefault();
      goForwardExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
      setTimeout(() => nextBtn.blur(), 0);
    });
  }

  if (mainEl) {
    mainEl.addEventListener('click', (event) => {
      if (suppressNextEmptyClick) {
        event.stopPropagation();
        suppressNextEmptyClick = false;
        return;
      }
      if (event.target.closest('.file-card')) return;
      Array.from(mainEl.querySelectorAll('.file-card')).forEach((card) => card.classList.remove('is-selected'));
    });
    mainEl.addEventListener('mousedown', (event) => {
      if (event.button !== 0) return;
      if (!event.target || event.target.closest('.file-card') || event.target.closest('.finder-sidebar') || event.target.closest('.finder-search') || event.target.closest('.toolbar-btn') || event.target.closest('.window__controls')) return;
      clearExplorerSelection();
      startPoint = getExplorerPoint(event.clientX, event.clientY);
      currentPoint = { ...startPoint };
      isSelecting = true;
      suppressNextEmptyClick = true;
      createExplorerMarquee(startPoint.x, startPoint.y);
      event.preventDefault();
    });
    mainEl.addEventListener('contextmenu', (event) => {
      if (!event.target.closest('.file-card')) {
        event.preventDefault();
        event.stopPropagation();
        showContextMenu(event.clientX, event.clientY, [
          { label: 'New Folder', action: () => createExplorerFolderInWindow(windowEl, 'New Folder', showContextMenu, openTextEditorWindow) },
          { type: 'divider' },
          { label: 'Get Info', disabled: true }
        ]);
      }
    });
  }

  const sidebarItems = windowEl.querySelectorAll('.finder-sidebar li');
  sidebarItems.forEach((item) => {
    item.addEventListener('click', () => {
      const folderId = item.dataset.folderId || 'root';
      if (folderId === 'root') {
        navigateExplorerWindow(windowEl, [], { pushHistory: false }, showContextMenu, openTextEditorWindow);
        return;
      }
      navigateExplorerWindow(windowEl, [folderId], { pushHistory: true }, showContextMenu, openTextEditorWindow);
    });
  });

  document.addEventListener('mousemove', onExplorerSelectionMove);
  document.addEventListener('mouseup', onExplorerSelectionUp);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isSelecting) {
      isSelecting = false;
      clearExplorerSelection();
      removeExplorerMarquee();
      startPoint = null;
      currentPoint = null;
      suppressNextEmptyClick = false;
    }
  });

  if (searchInput) {
    searchInput.addEventListener('focus', () => searchInput.classList.add('is-focused'));
    searchInput.addEventListener('blur', () => searchInput.classList.remove('is-focused'));
    searchInput.addEventListener('input', () => {
      windowEl.dataset.explorerSearch = searchInput.value;
      renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
    });
  }

  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
};

export const navigateExplorerWindow = (windowEl, nextSegments, { pushHistory = true } = {}, showContextMenu, openTextEditorWindow) => {
  const targetNode = getExplorerNodeBySegments(nextSegments);
  if (!targetNode || targetNode.type !== 'folder') return;

  const path = nextSegments.join('/');
  let history = [];
  try { history = JSON.parse(windowEl.dataset.explorerHistory || '[]'); } catch (e) {}
  let historyIndex = Number(windowEl.dataset.explorerHistoryIndex || 0);

  if (pushHistory) {
    history = history.slice(0, historyIndex + 1);
    if (history[history.length - 1] !== path) history.push(path);
    historyIndex = history.length - 1;
  }

  windowEl.dataset.explorerPath = path;
  windowEl.dataset.explorerHistory = JSON.stringify(history);
  windowEl.dataset.explorerHistoryIndex = String(historyIndex);
  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
};

export const goBackExplorerWindow = (windowEl, showContextMenu, openTextEditorWindow) => {
  const history = JSON.parse(windowEl.dataset.explorerHistory || '[]');
  let historyIndex = Number(windowEl.dataset.explorerHistoryIndex || 0);
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  const nextPath = history[historyIndex] || '';
  const nextSegments = nextPath.split('/').filter(Boolean);
  windowEl.dataset.explorerHistoryIndex = String(historyIndex);
  windowEl.dataset.explorerPath = nextPath;
  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
};

export const goForwardExplorerWindow = (windowEl, showContextMenu, openTextEditorWindow) => {
  const history = JSON.parse(windowEl.dataset.explorerHistory || '[]');
  let historyIndex = Number(windowEl.dataset.explorerHistoryIndex || 0);
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  const nextPath = history[historyIndex] || '';
  windowEl.dataset.explorerHistoryIndex = String(historyIndex);
  windowEl.dataset.explorerPath = nextPath;
  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
};

export const renameExplorerItemInWindow = (windowEl, nodeId, newName, showContextMenu, openTextEditorWindow) => {
  const currentNode = getExplorerNodeForWindow(windowEl);
  if (!currentNode || currentNode.type !== 'folder') return null;
  const target = currentNode.children.find((entry) => entry.id === nodeId);
  if (!target) return null;
  const cleanName = (newName || '').trim();
  if (!cleanName) return null;
  target.name = buildUniqueExplorerItemName(currentNode, cleanName, nodeId);
  syncDesktopFolderFromExplorerNode(target);
  delete windowEl.dataset.explorerRenameNodeId;
  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
  return target;
};

export const createExplorerFolderInWindow = (windowEl, baseName = 'New Folder', showContextMenu, openTextEditorWindow) => {
  const currentNode = getExplorerNodeForWindow(windowEl);
  if (!currentNode || currentNode.type !== 'folder') return null;
  const name = buildUniqueExplorerFolderName(currentNode, baseName);
  const folder = {
    id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    type: 'folder',
    children: []
  };
  currentNode.children.push(folder);
  renderExplorerWindow(windowEl, showContextMenu, openTextEditorWindow);
  return folder;
};
