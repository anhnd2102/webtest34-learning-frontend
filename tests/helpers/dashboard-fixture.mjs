export function createDOMFixture(t) {
  class Element extends EventTarget {
    value = '';
    textContent = '';
    innerHTML = '';
    hidden = false;
    disabled = false;
    style = {};
    dataset = {};
    classList = {
      _classes: new Set(),
      add(...cls) { for (const c of cls) this._classes.add(c); },
      remove(...cls) { for (const c of cls) this._classes.delete(c); },
      toggle(c, force) {
        if (force === true) this._classes.add(c);
        else if (force === false) this._classes.delete(c);
        else if (this._classes.has(c)) this._classes.delete(c);
        else this._classes.add(c);
      },
      contains(c) { return this._classes.has(c); }
    };
    elements = { apiBase: { value: '' }, actorId: { value: '' } };
    options = [];
    selectedOptions = [];
    setAttribute() {}
    removeAttribute() {}
    getAttribute() { return ''; }
    replaceChildren(...children) {
      this.textContent = '';
      this.innerHTML = '';
      this._children = children;
    }
    append(...children) {
      this._children = (this._children || []).concat(children);
    }
    querySelector(selector) {
      if (!this._queried) this._queried = new Map();
      if (!this._queried.has(selector)) this._queried.set(selector, new Element());
      return this._queried.get(selector);
    }
    querySelectorAll() { return []; }
    add(opt) { this.options.push(opt); }
  }

  const elements = new Map();
  const document = new Element();
  document.body = new Element();
  document.hidden = false;
  document.createElement = () => new Element();
  document.querySelector = selector => {
    if (!elements.has(selector)) elements.set(selector, new Element());
    return elements.get(selector);
  };
  document.querySelectorAll = () => [];
  document.defaultView = new EventTarget();
  document.defaultView.location = new URL('http://localhost/?classId=101&assignmentId=assign-1#dashboard');
  document.defaultView.history = { replaceState() {} };

  const saved = ['document', 'Option'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]);
  globalThis.document = document;
  globalThis.Option = class extends Element {
    constructor(text, value) { super(); this.textContent = text; this.value = value; }
  };
  t.after(() => {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return { document, get: selector => document.querySelector(selector) };
}
