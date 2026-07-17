// UEFI Functions
let currentTabIndex = 0
let currentItemIndex = 0
const tabs = ['main', 'advanced', 'security', 'boot', 'exit']

function updateUefiTime() {
  const now = new Date()
  const timeElement = document.getElementById('uefiTime')
  const dateElement = document.getElementById('uefiDate')

  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString('fr-FR')
  }
  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('fr-FR')
  }
}


function exitUefi() {

  const bootList = document.querySelectorAll('#boot .uefi-item.selectable')
  if (bootList.length === 0) {
    bootNormal()
    return
  }

  const firstBootOption = bootList[0].textContent.trim().toLowerCase()

  if (firstBootOption.includes('usb')) {

    showLoadingScreen("Booting from USB Device...")
    setTimeout(() => {

      window.location.href = '../Archiware2024/index.html';
    }, 2000)
  }
  else if (firstBootOption.includes('network')) {

    const url = prompt("Enter Boot Server URL (e.g. tftp://example.com)");
    if (url) {
      showLoadingScreen(`Connecting to ${url}...`)
      setTimeout(() => {
        alert("PXE-E61: Media test failure, check cable\nAn error occurred while booting from Network.")

        document.body.style.background = '#0d0e12'
        const overlay = document.getElementById('boot-loading-overlay')
        if (overlay) overlay.remove()
        document.querySelector('.uefi-screen').style.display = 'flex'
      }, 2500)
    }
  }
  else {

    showLoadingScreen("Loading ArchiwareOS...")
    setTimeout(() => {
      localStorage.setItem('show_boot_after_uefi', 'true')
      window.location.href = '../index.html'
    }, 2000)
  }
}

function showLoadingScreen(message) {
  document.body.style.background = '#000'
  document.querySelector('.uefi-screen').style.display = 'none'


  const bootOverlay = document.createElement('div')
  bootOverlay.id = 'boot-loading-overlay'
  bootOverlay.style.position = 'fixed'
  bootOverlay.style.inset = '0'
  bootOverlay.style.background = '#000'
  bootOverlay.style.color = '#ffffff'
  bootOverlay.style.display = 'flex'
  bootOverlay.style.flexDirection = 'column'
  bootOverlay.style.alignItems = 'center'
  bootOverlay.style.justifyContent = 'center'
  bootOverlay.style.fontFamily = '-apple-system, sans-serif'
  bootOverlay.style.zIndex = '9999'
  bootOverlay.innerHTML = `
    <div style="font-size: 18px; margin-bottom: 20px; font-weight: 500; letter-spacing: 0.05em;">${message}</div>
    <div class="uefi-spinner"></div>
  `
  document.body.appendChild(bootOverlay)
}

function resetUefi() {
  alert('UEFI settings reset to default values')

  window.location.reload()
}

function switchTab(direction) {
  currentTabIndex += direction
  if (currentTabIndex < 0) currentTabIndex = tabs.length - 1
  if (currentTabIndex >= tabs.length) currentTabIndex = 0

  // Update active tab
  document.querySelectorAll('.uefi-tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.uefi-tab-content').forEach(c => c.style.display = 'none')

  const activeTabId = tabs[currentTabIndex]
  const tabBtn = document.querySelector(`[data-tab="${activeTabId}"]`)
  const content = document.getElementById(activeTabId)

  if (tabBtn) tabBtn.classList.add('active')
  if (content) content.style.display = 'block'


  currentItemIndex = 0
  updateSelection()
}

function updateSelection() {
  const activeTabId = tabs[currentTabIndex]
  const content = document.getElementById(activeTabId)
  if (!content) return

  const selectableItems = content.querySelectorAll('.uefi-item.selectable')

  selectableItems.forEach(item => item.classList.remove('selected'))

  if (selectableItems.length > 0) {
    if (currentItemIndex < 0) currentItemIndex = 0
    if (currentItemIndex >= selectableItems.length) currentItemIndex = selectableItems.length - 1
    selectableItems[currentItemIndex].classList.add('selected')
  }
}


function moveBootItem(direction) {
  const activeTabId = tabs[currentTabIndex]
  if (activeTabId !== 'boot') return

  const content = document.getElementById('boot')
  const selectableItems = Array.from(content.querySelectorAll('.uefi-item.selectable'))

  if (selectableItems.length === 0) return

  const currentIndex = currentItemIndex
  const targetIndex = currentIndex + direction


  if (targetIndex >= 0 && targetIndex < selectableItems.length) {
    const currentItem = selectableItems[currentIndex]
    const targetItem = selectableItems[targetIndex]

    if (direction === -1) {

      targetItem.parentNode.insertBefore(currentItem, targetItem)
    } else {

      currentItem.parentNode.insertBefore(targetItem, currentItem)
    }


    refreshBootNumbers()


    currentItemIndex = targetIndex
    updateSelection()
  }
}

// index the boot items after reordering
function refreshBootNumbers() {
  const bootList = document.querySelectorAll('#boot .uefi-item.selectable')
  bootList.forEach((item, index) => {
    const label = item.querySelector('.uefi-label')
    if (label) {

      const textWithoutNumber = label.textContent.replace(/^\s*\d+\.\s*/, '')
      label.textContent = `  ${index + 1}. ${textWithoutNumber}`
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  updateUefiTime()
  setInterval(updateUefiTime, 1000)

  // tab click navigation
  document.querySelectorAll('.uefi-tab').forEach((tab, index) => {
    tab.addEventListener('click', () => {
      currentTabIndex = index
      document.querySelectorAll('.uefi-tab').forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.uefi-tab-content').forEach(c => c.style.display = 'none')

      tab.classList.add('active')
      const tabId = tab.getAttribute('data-tab')
      const content = document.getElementById(tabId)
      if (content) content.style.display = 'block'

      currentItemIndex = 0
      updateSelection()
    })
  })


  document.addEventListener('click', (e) => {
    const selectable = e.target.closest('.uefi-item.selectable')
    if (selectable) {
      const activeTabId = tabs[currentTabIndex]
      const content = document.getElementById(activeTabId)
      const selectables = Array.from(content.querySelectorAll('.uefi-item.selectable'))

      currentItemIndex = selectables.indexOf(selectable)
      updateSelection()
    }
  })
})

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  const activeTabId = tabs[currentTabIndex]

  switch(e.key) {
    case 'Escape':
      exitUefi()
      break
    case 'F10':
      exitUefi()
      break
    case 'ArrowLeft':
      switchTab(-1)
      break
    case 'ArrowRight':
      switchTab(1)
      break
    case 'ArrowUp':
      currentItemIndex--
      updateSelection()
      break
    case 'ArrowDown':
      currentItemIndex++
      updateSelection()
      break
    case '+':
    case 'PageUp':
      if (activeTabId === 'boot') {
        e.preventDefault()
        moveBootItem(-1)
      }
      break
    case '-':
    case 'PageDown':
      if (activeTabId === 'boot') {
        e.preventDefault()
        moveBootItem(1)
      }
      break
    case 'Enter':
      const selectedItem = document.querySelector('.uefi-item.selected')
      if (selectedItem) {
        selectedItem.click()
      }
      break
  }
})


function toggleSettingValue(item) {
  const valueElement = item.querySelector('.uefi-value')
  if (!valueElement) return

  if (valueElement.textContent === '[Enabled]') {
    valueElement.textContent = '[Disabled]'
  } else if (valueElement.textContent === '[Disabled]') {
    valueElement.textContent = '[Enabled]'
  }
}


function handleSpecialActions(item) {
  if (item.id === 'btnSupervisorPassword') {
    const password = prompt("Enter New Supervisor Password:")
    const valueElement = item.querySelector('.uefi-value')
    if (password) {
      valueElement.textContent = "[Set]"
      valueElement.style.color = "#007dfa" // Use blue to indicate the setting is configured
    } else {
      valueElement.textContent = "[Not Set]"
      valueElement.style.color = ""
    }
  }
}


document.addEventListener('click', (e) => {
  const item = e.target.closest('.uefi-item.selectable')
  if (item) {
    if (item.classList.contains('toggleable')) {
      toggleSettingValue(item)
    } else {
      handleSpecialActions(item)
    }
  }
})


document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const selectedItem = document.querySelector('.uefi-item.selected')
    if (selectedItem) {
      if (selectedItem.classList.contains('toggleable')) {
        toggleSettingValue(selectedItem)
      } else {
        handleSpecialActions(selectedItem)
      }
    }
  }
})