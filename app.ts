import { IonButton } from '@ionic/core/components/ion-button'
import { IonToast } from '@ionic/core/components/ion-toast'
import { IonList } from '@ionic/core/components/ion-list'
import { IonModal } from '@ionic/core/components/ion-modal'

let baseUrl = 'https://dae-mobile-assignment.hkit.cc/api'

// let items = [1, 2, 3]

declare var refreshButton: IonButton
refreshButton.addEventListener('click', loadItems)

declare var loginModal: IonModal
declare var errorToast: IonToast

let petList: IonList = document.querySelector('#pet-list')!

let page = 1

declare var prevPageButton: IonButton
prevPageButton.addEventListener('click', () => {
  page--
  loadItems()
})

declare var nextPageButton: IonButton
nextPageButton.addEventListener('click', () => {
  page++
  loadItems()
})

let skeletonItem = petList.querySelector('.skeleton-item')!
skeletonItem.remove()

let itemCardTemplate = petList.querySelector('.item-card')!
itemCardTemplate.remove()

let token = localStorage.getItem('token')

async function loadItems() {
  console.log('loading items...')
  petList.textContent = ''
  petList.appendChild(skeletonItem.cloneNode(true))
  petList.appendChild(skeletonItem.cloneNode(true))
  petList.appendChild(skeletonItem.cloneNode(true))
  let params = new URLSearchParams()
  params.set('page', page.toString())
  let res = await fetch(`${baseUrl}/pet-breeds?${params}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  let json = (await res.json()) as Result
  if (json.error) {
    errorToast.message = json.error
    errorToast.present()
    petList.textContent = ''
    return
  }
  errorToast.dismiss()

  let maxPage = Math.ceil(json.pagination.total / json.pagination.limit)

  prevPageButton.hidden = json.pagination.page <= 1
  nextPageButton.hidden = json.pagination.page >= maxPage

  type Result = {
    error: string
    items: Item[]
    pagination: {
      page: number
      limit: number
      total: number
    }
  }

  type Item = {
    id: number
    tags: string[]
    origin: string
    lifespan: string
    size: string
    title: string
    description: string
    category: string
    image_url: string
    video_url: string
    published_at: string
    temperaments: string[]
  }
  let items = json.items as Item[]
  console.log('items:', items)

  let bookmarkedItemIds = await autoRetryGetBookmarks()

  petList.textContent = ''
  for (let item of items) {
    let card = itemCardTemplate.cloneNode(true) as HTMLIonCardElement

    card.querySelector('.item-title')!.textContent = item.title
    card.querySelector('.item-subtitle')!.textContent =
      item.temperaments.join(', ') + ' | ' + item.origin

    let favoriteBtn = card.querySelector('.favorite-btn')!
    let favoriteIcon = favoriteBtn.querySelector('ion-icon')!
    favoriteIcon.name = bookmarkedItemIds.includes(item.id)
      ? 'star'
      : 'star-outline'
    favoriteBtn.addEventListener('click', async () => {
      if (!token) {
        loginModal.present()
        return
      }

      try {
        await bookmarkItem(item.id)
        favoriteIcon.name = 'star'
        errorToast.dismiss()
      } catch (error) {
        errorToast.message = String(error)
        errorToast.present()
      }
    })

    card.querySelector('.item-details')!.textContent = item.description
    card.querySelector('.item-date')!.textContent = `日期: ${item.published_at}`

    card.querySelector<HTMLImageElement>('.course-image')!.src = item.image_url

    let iframe = card.querySelector<HTMLIFrameElement>(
      '.video-container iframe',
    )!
    let video = card.querySelector<HTMLVideoElement>('.video-container video')!
    if (item.video_url.includes('youtube.com')) {
      iframe.src = item.video_url.replace('watch?v=', 'embed/')
      video.remove()
    } else {
      video.src = item.video_url
      iframe.remove()
    }

    let tagContainer = card.querySelector<HTMLDivElement>('.tag-container')!
    let chipTemplate =
      tagContainer.querySelector<HTMLIonChipElement>('ion-chip')!
    chipTemplate.remove()
    for (let tag of item.tags) {
      let chip = chipTemplate.cloneNode(true) as HTMLIonChipElement
      chip.textContent = tag
      chip.dataset.type = tag
      chip.addEventListener('click', () => {
        // TODO filterByTag(tag)
      })
      tagContainer.appendChild(chip)
    }
    petList.appendChild(card)
  }
}
loadItems()

declare var usernameInput: HTMLIonInputElement
declare var passwordInput: HTMLIonInputElement
declare var loginButton: HTMLIonButtonElement
declare var registerButton: HTMLIonButtonElement

loginButton.addEventListener('click', async () => {
  await handleAuth('login')
})

registerButton.addEventListener('click', async () => {
  await handleAuth('signup')
})

async function handleAuth(mode: 'signup' | 'login') {
  let username = usernameInput.value
  let password = passwordInput.value

  let res = await fetch(`${baseUrl}/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  let json = await res.json()
  if (json.error) {
    errorToast.message = json.error
    errorToast.present()
    return
  }
  errorToast.dismiss()
  token = json.token
  localStorage.setItem('token', json.token)
  loginModal.dismiss()
  // TODO load bookmarks
}

async function bookmarkItem(item_id: number) {
  let res = await fetch(`${baseUrl}/bookmarks/${item_id}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  let json = await res.json()
  if (json.error) {
    throw json.error
  }
}
async function unBookmarkItem(item_id: number, icon: HTMLIonIconElement) {
  try {
    // TODO call server API
    throw 'TODO: call server API'
  } catch (error) {
    errorToast.message = String(error)
    errorToast.present()
  }
}
async function getBookmarks() {
    if(!token){
        return[]
    }
  let res = await fetch(`${baseUrl}/bookmarks`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  let json = await res.json()
  if (json.error) {
    throw json.error
  }
  return json.item_ids as number[]
}

async function autoRetryGetBookmarks() {
  let error = null
  for (let i = 0; i < 3; i++) {
    try {
      let itemIds = await getBookmarks()
      return itemIds
    } catch (err) {
      error = err
    }
  }
  throw error
}
