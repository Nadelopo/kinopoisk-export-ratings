// ==UserScript==
// @name         KinoPoisk Ratings Exporter
// @namespace    https://kinopoisk.ru
// @version      1.0
// @description  Export your KinoPoisk ratings to JSON with one click
// @match        https://www.kinopoisk.ru/user/*/votes/*
// @grant        none
// ==/UserScript==

;(function () {
  "use strict"

  function extractVotesFromDoc(doc) {
    const items = doc.querySelectorAll(".profileFilmsList .item")
    const result = []

    for (const item of items) {
      const titleEl = item.querySelector(".nameRus a")
      if (!titleEl) continue

      const title = titleEl.textContent?.trim() ?? ""
      const href = titleEl.getAttribute("href") ?? ""
      const kpIdMatch = href.match(/\/(film|series)\/(\d+)\//)
      const kpId = kpIdMatch ? parseInt(kpIdMatch[2], 10) : 0
      const titleEn = item.querySelector(".nameEng")?.textContent?.trim() ?? ""
      const rating = parseInt(
        item.querySelector(".vote")?.textContent?.trim() ?? "0",
        10
      )

      if (title && rating && kpId) {
        result.push({ kpId, title, titleEn, rating })
      }
    }

    return result
  }

  function getTotalPages() {
    const links = document.querySelectorAll('.navigator a[href*="page/"]')
    const nums = Array.from(links)
      .map((el) => {
        const m = el.getAttribute("href")?.match(/page\/(\d+)/)
        return m ? parseInt(m[1], 10) : 0
      })
      .filter((n) => n > 0)
    const total = nums.length ? Math.max(...nums) : 1

    return total
  }

  function getUserId() {
    const m = location.pathname.match(/\/user\/(\d+)\//)
    return m ? m[1] : null
  }

  function downloadJson(data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "parsed-from-kp.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function fetchPage(userId, pageNum) {
    const url = `https://www.kinopoisk.ru/user/${userId}/votes/list/vs/vote/perpage/200/page/${pageNum}/#list`
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) throw new Error(`HTTP ${res.status} for page ${pageNum}`)
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, "text/html")
    const votes = extractVotesFromDoc(doc)
    return votes
  }

  async function exportAll(btn) {
    const userId = getUserId()
    if (!userId) return alert("Не удалось определить ID пользователя")

    const totalPages = getTotalPages()
    const allVotes = [...extractVotesFromDoc(document)]
    btn.textContent = `Собираем... 1/${totalPages}`

    for (let p = 2; p <= totalPages; p++) {
      btn.textContent = `Собираем... ${p}/${totalPages}`
      try {
        const votes = await fetchPage(userId, p)
        allVotes.push(...votes)
      } catch (e) {}
    }

    downloadJson(allVotes)
    btn.textContent = `✓ Экспортировано ${allVotes.length}`
    btn.disabled = false
  }

  // Add button to page
  const btn = document.createElement("button")
  btn.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        padding: 10px 16px;
        background: #f60;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `

  btn.textContent = "⬇ Экспорт оценок"
  btn.addEventListener("click", () => {
    btn.disabled = true
    exportAll(btn)
  })

  document.body.appendChild(btn)
})()
