// @ts-check

import axios from 'axios'
import contact from '../data/contact'

/**
 * @returns {import('../@types').Components.ContactComponent}
 */
export default () => {
  const component = document.querySelector('.contact__container--main')
  const url = component.getAttribute('data-url')
  const echo = window.Echo.join('basement.contacts')

  return {
    contacts: [],
    search: '',
    url,

    /**
     * Hook during the initialization phase of the current Alpine component.
     */
    init() {
      this.$refs
        .basementChatBox
        .addEventListener('update-last-private-message', this.updateLastPrivateMessage.bind(this))
    },

    /**
     * Load initial component data.
     */
    async mount() {
      /** @type import('../@types').Api.GetAllContactsResult */
      const response = await axios.get(this.url).then(({ data }) => data)

      this.contacts = response.data.map((value) => contact(value))

      this.registerEchoEventListeners()
    },

    /**
     * Get contacts filtered by search keywords.
     */
    get filteredContacts() {
      if (this.search === '') {
        return this.contacts
      }

      return this.contacts.filter(({ name }) => name.toLowerCase().includes(this.search.toLowerCase()))
    },

    /**
     * Find the same contact with the given id in the current component.
     */
    findSameContact(searchId) {
      return this.contacts.find(({ id }) => id === searchId)
    },

    /**
     * Laravel Echo event listener to see other contacts that are on the current channel.
     */
    onHere(values) {
      values.forEach((value) => {
        this.findSameContact(value.id).isOnline = true
      })
    },

    /**
     * Laravel Echo event listener when someone joins the channel.
     */
    onSomeoneJoining(value) {
      const sameContact = this.findSameContact(value.id)

      if (sameContact === undefined) {
        const data = contact(value)
        data.isOnline = true
        this.contacts.push(data)
      } else {
        sameContact.isOnline = true
      }
    },

    /**
     * Laravel Echo event listener when someone leaves the channel.
     */
    onSomeoneLeaving(value) {
      const sameContact = this.contacts.find(({ id }) => id === value.id)
      sameContact.isOnline = false
    },

    /**
     * Register Laravel Echo event listeners.
     */
    registerEchoEventListeners() {
      echo
        .here(this.onHere.bind(this))
        .joining(this.onSomeoneJoining.bind(this))
        .leaving(this.onSomeoneLeaving.bind(this))
    },

    /**
     * HTML DOM event listener to update the last private message in the current component.
     */
    updateLastPrivateMessage(/** @type import('../@types').Events.UpdateLastPrivateMessageEvent */ event) {
      const sameContactIndex = this.contacts.findIndex(({ id }) => id === event.detail.senderId)
      const sameContact = this.contacts.splice(sameContactIndex, 1).at(0)

      sameContact.lastPrivateMessage = event.detail

      if (sameContact.id !== event.detail.senderId) {
        sameContact.unreadMessages += 1
      }

      this.contacts.unshift(sameContact)
    },

    /**
     * Trigger update receiver event to the chat box component.
     */
    updateReceiver(value) {
      this.$dispatch('update-receiver', value)
    },
  }
}
