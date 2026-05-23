export class Store {
  constructor(initialState = {}) {
    this.state = {
      route: "dashboard",
      loading: false,
      user: null,
      dashboard: null,
      messages: [],
      aiAnswer: "",
      provider: "",
      toast: "",
      ...initialState
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  set(patch) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  get() {
    return this.state;
  }
}
