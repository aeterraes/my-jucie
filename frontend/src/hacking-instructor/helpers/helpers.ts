import jwtDecode from 'jwt-decode'
import DOMPurify from 'dompurify'

let config: any
const playbackDelays = {
  faster: 0.5,
  fast: 0.75,
  normal: 1.0,
  slow: 1.25,
  slower: 1.5
}

// Проверка, решена ли задача
export async function isChallengeSolved(challengeName: string): Promise<boolean> {
  try {
    const res = await fetch('/api/Challenges/')
    const json = await res.json()
    const challenges: { name: string, solved: boolean }[] = json.data || []
    return challenges.some(c => c.name === challengeName && c.solved)
  } catch {
    return false
  }
}

// Sleep
export async function sleep(timeInMs: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, timeInMs))
}

// Функция безопасного получения вложенного свойства
function safeGet(obj: any, path: string[]): any {
  return path.reduce((acc, key) => (acc && Object.hasOwn(acc, key) ? acc[key] : undefined), obj)
}

// Ожидание значения input
export function waitForInputToHaveValue(inputSelector: string, value: string, options: any = { ignoreCase: true, replacement: [] }) {
  return async () => {
    const inputElement = document.querySelector<HTMLInputElement>(inputSelector)
    if (!inputElement) return

    if (options.replacement?.length === 2) {
      if (!config) {
        const res = await fetch('/rest/admin/application-configuration')
        const json = await res.json()
        config = json.config
      }
      const propertyChain = options.replacement[1].split('.')
      const replacementValue = safeGet(config, propertyChain)
      if (replacementValue !== undefined) {
        value = value.replace(options.replacement[0], String(replacementValue))
      }
    }

    while (true) {
      const inputVal = inputElement.value
      if ((options.ignoreCase && inputVal.toLowerCase() === value.toLowerCase()) ||
        (!options.ignoreCase && inputVal === value)) {
        break
      }
      await sleep(100)
    }
  }
}

// Безопасное присвоение innerHTML
export function setElementInnerHtmlSafe(selector: string, html: string) {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) return
  el.innerHTML = DOMPurify.sanitize(html)
}

// JWT проверка безопасно
export function waitForAdminLogIn() {
  return async () => {
    while (true) {
      let role = ''
      try {
        const token = localStorage.getItem('token')
        if (token) {
          const decoded = jwtDecode(token) as any
          role = decoded?.data?.role || ''
        }
      } catch {
        console.log('Role from token could not be accessed.')
      }
      if (role === 'admin') break
      await sleep(100)
    }
  }
}

// В остальных waitFor функций добавляем проверки на null и при необходимости DOMPurify для innerHTML
export function waitForElementsInnerHtmlToBe(selector: string, value: string) {
  return async () => {
    while (true) {
      const el = document.querySelector<HTMLElement>(selector)
      if (el && DOMPurify.sanitize(el.innerHTML) === value) break
      await sleep(100)
    }
  }
}
