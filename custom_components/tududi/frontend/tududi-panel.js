//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, re = f.trustedTypes, ie = re ? re.emptyScript : "", ae = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, oe = (e, t) => !l(e, t), se = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: oe
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var h = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = se) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? se;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? oe)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
h.elementStyles = [], h.shadowRootOptions = { mode: "open" }, h[p("elementProperties")] = /* @__PURE__ */ new Map(), h[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: h }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var g = globalThis, ce = (e) => e, _ = g.trustedTypes, le = _ ? _.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, v = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, ue = "?" + y, de = `<${ue}>`, b = document, x = () => b.createComment(""), S = (e) => e === null || typeof e != "object" && typeof e != "function", C = Array.isArray, fe = (e) => C(e) || typeof e?.[Symbol.iterator] == "function", w = "[ 	\n\f\r]", T = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, E = /-->/g, D = />/g, O = RegExp(`>|${w}(?:([^\\s"'>=/]+)(${w}*=${w}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), k = /'/g, A = /"/g, pe = /^(?:script|style|textarea|title)$/i, j = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), M = j(1), me = j(2), N = Symbol.for("lit-noChange"), P = Symbol.for("lit-nothing"), he = /* @__PURE__ */ new WeakMap(), F = b.createTreeWalker(b, 129);
function ge(e, t) {
	if (!C(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return le === void 0 ? t : le.createHTML(t);
}
var _e = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = T;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === T ? c[1] === "!--" ? o = E : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = O) : (pe.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = O) : o = D : o === O ? c[0] === ">" ? (o = i ?? T, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? O : c[3] === "\"" ? A : k) : o === A || o === k ? o = O : o === E || o === D ? o = T : (o = O, i = void 0);
		let d = o === O && e[t + 1].startsWith("/>") ? " " : "";
		a += o === T ? n + de : l >= 0 ? (r.push(s), n.slice(0, l) + v + n.slice(l) + y + d) : n + y + (l === -2 ? t : d);
	}
	return [ge(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, I = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = _e(t, n);
		if (this.el = e.createElement(l, r), F.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = F.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(v)) {
					let t = u[o++], n = i.getAttribute(e).split(y), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? ye : r[1] === "?" ? be : r[1] === "@" ? xe : z
					}), i.removeAttribute(e);
				} else e.startsWith(y) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (pe.test(i.tagName)) {
					let e = i.textContent.split(y), t = e.length - 1;
					if (t > 0) {
						i.textContent = _ ? _.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], x()), F.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], x());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === ue) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(y, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += y.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = b.createElement("template");
		return n.innerHTML = e, n;
	}
};
function L(e, t, n = e, r) {
	if (t === N) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = S(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = L(e, i._$AS(e, t.values), i, r)), t;
}
var ve = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? b).importNode(t, !0);
		F.currentNode = r;
		let i = F.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new R(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Se(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = F.nextNode(), a++);
		}
		return F.currentNode = b, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, R = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = P, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = L(this, e, t), S(e) ? e === P || e == null || e === "" ? (this._$AH !== P && this._$AR(), this._$AH = P) : e !== this._$AH && e !== N && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? fe(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== P && S(this._$AH) ? this._$AA.nextSibling.data = e : this.T(b.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = I.createElement(ge(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new ve(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = he.get(e.strings);
		return t === void 0 && he.set(e.strings, t = new I(e)), t;
	}
	k(t) {
		C(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(x()), this.O(x()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = ce(e).nextSibling;
			ce(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, z = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = P, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = P;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = L(this, e, t, 0), a = !S(e) || e !== this._$AH && e !== N, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = L(this, r[n + o], t, o), s === N && (s = this._$AH[o]), a ||= !S(s) || s !== this._$AH[o], s === P ? e = P : e !== P && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === P ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, ye = class extends z {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === P ? void 0 : e;
	}
}, be = class extends z {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== P);
	}
}, xe = class extends z {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = L(this, e, t, 0) ?? P) === N) return;
		let n = this._$AH, r = e === P && n !== P || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== P && (n === P || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Se = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		L(this, e);
	}
}, Ce = g.litHtmlPolyfillSupport;
Ce?.(I, R), (g.litHtmlVersions ??= []).push("3.3.3");
var we = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new R(t.insertBefore(x(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, B = globalThis, V = class extends h {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = we(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return N;
	}
};
V._$litElement$ = !0, V.finalized = !0, B.litElementHydrateSupport?.({ LitElement: V });
var Te = B.litElementPolyfillSupport;
Te?.({ LitElement: V }), (B.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/api.ts
var Ee = class {
	constructor(e) {
		this.getHass = e;
	}
	call(e, t = {}) {
		return this.getHass().callWS({
			type: `tududi/${e}`,
			...t
		});
	}
	entries() {
		return this.call("entries");
	}
	subscribe(e, t) {
		return this.getHass().connection.subscribeMessage(t, {
			type: "tududi/subscribe",
			entry_id: e
		});
	}
	refresh(e) {
		return this.call("refresh", { entry_id: e });
	}
	createTask(e, t, n = {}) {
		return this.call("task/create", {
			entry_id: e,
			name: t,
			...n
		});
	}
	updateTask(e, t, n) {
		return this.call("task/update", {
			entry_id: e,
			uid: t,
			...n
		});
	}
	deleteTask(e, t) {
		return this.call("task/delete", {
			entry_id: e,
			uid: t
		});
	}
	createNote(e, t, n = {}) {
		return this.call("note/create", {
			entry_id: e,
			title: t,
			...n
		});
	}
	updateNote(e, t, n) {
		return this.call("note/update", {
			entry_id: e,
			uid: t,
			...n
		});
	}
	deleteNote(e, t) {
		return this.call("note/delete", {
			entry_id: e,
			uid: t
		});
	}
};
function H(e) {
	return e && typeof e == "object" && "message" in e ? String(e.message) : String(e);
}
//#endregion
//#region src/icons.ts
var De = {
	menu: "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
	refresh: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
	close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
	delete: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
	back: "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",
	check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
	plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
	note: "M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,12V14H19V12H5M5,16V18H14V16H5Z",
	pencil: "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
	repeat: "M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"
};
function U(e, t = 24) {
	return me`<svg viewBox="0 0 24 24" width=${t} height=${t} aria-hidden="true"><path fill="currentColor" d=${De[e]}></path></svg>`;
}
//#endregion
//#region src/logic.ts
var W = [
	{
		id: "today",
		label: "Today"
	},
	{
		id: "upcoming",
		label: "Upcoming"
	},
	{
		id: "overdue",
		label: "Overdue"
	},
	{
		id: "inbox",
		label: "Inbox"
	},
	{
		id: "invoices",
		label: "Invoices"
	},
	{
		id: "all",
		label: "All open"
	},
	{
		id: "done",
		label: "Completed"
	}
], G = 864e5;
function K(e) {
	let [t, n, r] = e.split("-").map(Number);
	return Date.UTC(t, n - 1, r);
}
function q(e, t) {
	return Math.round((K(t) - K(e)) / G);
}
function J(e, t) {
	return new Date(K(e) + t * G).toISOString().slice(0, 10);
}
function Oe(e) {
	return e < 0 ? "overdue" : e === 0 ? "today" : e <= 7 ? "soon" : "later";
}
function Y(e, t = "en") {
	return new Date(K(e)).toLocaleDateString(t, {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	});
}
function X(e, t, n = "en") {
	let r = q(e, t);
	return r === 0 ? "Today" : r === 1 ? "Tomorrow" : r === -1 ? "Yesterday" : r < 0 ? `${-r} days overdue` : r < 7 ? new Date(K(t)).toLocaleDateString(n, {
		weekday: "long",
		timeZone: "UTC"
	}) : Y(t, n);
}
function ke(e, t) {
	let n = t.toLocaleLowerCase();
	return e.tags.some((e) => e.toLocaleLowerCase() === n);
}
function Ae(e, t) {
	if (e.due_date !== t.due_date) return e.due_date ? t.due_date ? e.due_date < t.due_date ? -1 : 1 : -1 : 1;
	let n = e.priority ?? -1, r = t.priority ?? -1;
	return n === r ? e.name.localeCompare(t.name) : r - n;
}
function je(e, t) {
	let n = e.completed_at ?? "", r = t.completed_at ?? "";
	return n === r ? e.name.localeCompare(t.name) : n < r ? 1 : -1;
}
function Me(e, t) {
	let n = t.trim().toLocaleLowerCase();
	return !n || e.name.toLocaleLowerCase().includes(n) || e.note.toLocaleLowerCase().includes(n) || e.tags.some((e) => e.toLocaleLowerCase().includes(n));
}
function Ne(e, t) {
	let n = e.today, r = e.tasks;
	if (t.startsWith("project:")) {
		let e = t.slice(8);
		return r.filter((t) => t.project_uid === e && (t.open || t.done));
	}
	if (t.startsWith("tag:")) {
		let e = t.slice(4);
		return r.filter((t) => ke(t, e) && (t.open || t.done));
	}
	switch (t) {
		case "today": return r.filter((e) => e.open && e.due_date !== null && e.due_date <= n);
		case "upcoming": return r.filter((e) => e.open && e.due_date !== null && e.due_date > n);
		case "overdue": return r.filter((e) => e.open && e.due_date !== null && e.due_date < n);
		case "inbox": return r.filter((e) => e.open && !e.project_uid && !e.due_date);
		case "invoices": return r.filter((t) => ke(t, e.reminder_tag) && (t.open || t.done));
		case "done": return r.filter((e) => e.done);
		default: return r.filter((e) => e.open);
	}
}
function Z(e, t) {
	return Ne(e, t).filter((e) => e.open).length;
}
function Pe(e, t, n, r = "en") {
	let i = e.today, a = n.filter((e) => e.open).sort(Ae), o = n.filter((e) => !e.open).sort(je), s = [], c = (e, t, n) => {
		n.length && s.push({
			key: e,
			label: t,
			tasks: n
		});
	};
	if (t === "today") c("overdue", "Overdue", a.filter((e) => e.due_date < i)), c("today", "Today", a.filter((e) => e.due_date === i));
	else if (t === "upcoming") {
		let e = /* @__PURE__ */ new Map();
		for (let t of a) {
			let n = e.get(t.due_date) ?? [];
			n.push(t), e.set(t.due_date, n);
		}
		for (let [t, n] of e) c(t, q(i, t) < 7 ? `${X(i, t, r)} · ${Y(t, r)}` : Y(t, r), n);
	} else if (t === "invoices") {
		let t = J(i, e.reminder_days_before);
		c("overdue", "Overdue", a.filter((e) => e.due_date !== null && e.due_date < i)), c("soon", `Due within ${e.reminder_days_before} days`, a.filter((e) => e.due_date !== null && e.due_date >= i && e.due_date <= t)), c("later", "Later", a.filter((e) => e.due_date !== null && e.due_date > t)), c("nodate", "No due date", a.filter((e) => e.due_date === null)), c("done", "Paid", o);
	} else t === "done" ? c("done", null, o) : (c("open", null, a), c("done", "Completed", o));
	return s;
}
function Fe(e, t) {
	if (t.startsWith("project:")) return { project_uid: t.slice(8) };
	if (t.startsWith("tag:")) return { tags: [t.slice(4)] };
	switch (t) {
		case "today": return { due_date: e.today };
		case "upcoming": return { due_date: J(e.today, 1) };
		case "invoices": return { tags: [e.reminder_tag] };
		default: return {};
	}
}
function Q(e, t) {
	if (t.startsWith("project:")) {
		let n = t.slice(8);
		return e?.projects.find((e) => e.uid === n)?.name ?? "Project";
	}
	return t.startsWith("tag:") ? `#${t.slice(4)}` : W.find((e) => e.id === t)?.label ?? "Tasks";
}
function Ie(e) {
	let t = decodeURIComponent((e ?? "").replace(/^\/+/, ""));
	return t && (t.startsWith("project:") || t.startsWith("tag:") || W.some((e) => e.id === t)) ? t : "today";
}
function Le(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e.split(",")) {
		let e = r.trim().replace(/^#/, ""), i = e.toLocaleLowerCase();
		e && !t.has(i) && (t.add(i), n.push(e));
	}
	return n;
}
function Re(e) {
	return e.split(/\s+/).filter(Boolean).slice(0, 2).map((e) => e[0].toLocaleUpperCase()).join("");
}
function ze(e, t) {
	let n = e.tasks.some((e) => e.uid === t.uid);
	return {
		...e,
		tasks: n ? e.tasks.map((e) => e.uid === t.uid ? t : e) : [...e.tasks, t]
	};
}
//#endregion
//#region src/tududi-notes.ts
var Be = class extends V {
	static {
		this.properties = {
			notes: { attribute: !1 },
			heading: {},
			canAdd: {
				type: Boolean,
				attribute: "can-add"
			},
			editing: { state: !0 },
			draftTitle: { state: !0 },
			draftContent: { state: !0 },
			expanded: { state: !0 }
		};
	}
	constructor() {
		super(), this.notes = [], this.heading = "Notes", this.canAdd = !0, this.editing = null, this.draftTitle = "", this.draftContent = "", this.expanded = /* @__PURE__ */ new Set();
	}
	startEdit(e) {
		this.editing = e ? e.uid : "new", this.draftTitle = e?.title ?? "", this.draftContent = e?.content ?? "";
	}
	save() {
		let e = this.draftTitle.trim();
		e && (this.dispatchEvent(new CustomEvent("note-save", {
			detail: {
				uid: this.editing === "new" ? null : this.editing,
				title: e,
				content: this.draftContent
			},
			bubbles: !0,
			composed: !0
		})), this.editing = null);
	}
	removeNote(e) {
		confirm(`Delete note "${e.title}"?`) && this.dispatchEvent(new CustomEvent("note-delete", {
			detail: { uid: e.uid },
			bubbles: !0,
			composed: !0
		}));
	}
	toggle(e) {
		let t = new Set(this.expanded);
		t.has(e) ? t.delete(e) : t.add(e), this.expanded = t;
	}
	renderEditor() {
		return M`
      <div class="editor">
        <input
          class="title-input"
          placeholder="Title"
          .value=${this.draftTitle}
          @input=${(e) => this.draftTitle = e.target.value}
        />
        <textarea
          rows="5"
          placeholder="Write a note…"
          .value=${this.draftContent}
          @input=${(e) => this.draftContent = e.target.value}
        ></textarea>
        <div class="actions">
          <button class="text" @click=${() => this.editing = null}>Cancel</button>
          <button class="primary" ?disabled=${!this.draftTitle.trim()} @click=${this.save}>
            Save
          </button>
        </div>
      </div>
    `;
	}
	render() {
		let e = [...this.notes].sort((e, t) => (t.updated_at ?? "").localeCompare(e.updated_at ?? ""));
		return M`
      <div class="header">
        <span class="heading">${U("note", 18)} ${this.heading}</span>
        ${this.canAdd && this.editing !== "new" ? M`<button class="text" @click=${() => this.startEdit(null)}>
              ${U("plus", 18)} Add note
            </button>` : P}
      </div>
      ${this.editing === "new" ? this.renderEditor() : P}
      ${e.length === 0 && this.editing !== "new" ? M`<div class="empty">No notes yet.</div>` : P}
      ${e.map((e) => this.editing === e.uid ? this.renderEditor() : M`
              <div class="note">
                <div class="note-head">
                  <button class="note-title" @click=${() => this.toggle(e.uid)}>
                    ${e.title}
                  </button>
                  <button class="icon" title="Edit" @click=${() => this.startEdit(e)}>
                    ${U("pencil", 18)}
                  </button>
                  <button class="icon" title="Delete" @click=${() => this.removeNote(e)}>
                    ${U("delete", 18)}
                  </button>
                </div>
                <div class="content ${this.expanded.has(e.uid) ? "expanded" : ""}"
                  @click=${() => this.toggle(e.uid)}>${e.content}</div>
              </div>
            `)}
    `;
	}
	static {
		this.styles = o`
    :host {
      display: block;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .heading {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .empty {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      padding: 4px 0 8px;
    }
    .note {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: var(--card-background-color);
    }
    .note-head {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .note-title {
      flex: 1;
      text-align: left;
      font: inherit;
      font-weight: 500;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 0;
      cursor: pointer;
    }
    .content {
      white-space: pre-wrap;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin-top: 4px;
      max-height: 4.5em;
      overflow: hidden;
      cursor: pointer;
    }
    .content.expanded {
      max-height: none;
    }
    .editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    input,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
    }
    textarea {
      resize: vertical;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 4px 6px;
      border-radius: 6px;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
    }
    button.primary:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover,
    button.text:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
  `;
	}
};
customElements.define("tududi-notes", Be);
//#endregion
//#region src/types.ts
var $ = {
	NOT_STARTED: 0,
	IN_PROGRESS: 1,
	DONE: 2,
	ARCHIVED: 3,
	WAITING: 4,
	CANCELLED: 5,
	PLANNED: 6
}, Ve = {
	0: "Not started",
	1: "In progress",
	2: "Done",
	3: "Archived",
	4: "Waiting",
	5: "Cancelled",
	6: "Planned"
}, He = {
	0: "Low",
	1: "Medium",
	2: "High"
}, Ue = [
	$.NOT_STARTED,
	$.IN_PROGRESS,
	$.WAITING,
	$.PLANNED,
	$.DONE
], We = class extends V {
	static {
		this.properties = {
			task: { attribute: !1 },
			snap: { attribute: !1 },
			language: {}
		};
	}
	constructor() {
		super(), this.language = "en";
	}
	change(e) {
		this.dispatchEvent(new CustomEvent("task-change", {
			detail: {
				uid: this.task.uid,
				fields: e
			},
			bubbles: !0,
			composed: !0
		}));
	}
	close() {
		this.dispatchEvent(new CustomEvent("close", {
			bubbles: !0,
			composed: !0
		}));
	}
	deleteTask() {
		confirm(`Delete task "${this.task.name}"?`) && this.dispatchEvent(new CustomEvent("task-delete", {
			detail: { uid: this.task.uid },
			bubbles: !0,
			composed: !0
		}));
	}
	onName(e) {
		let t = e.target.value.trim();
		t && t !== this.task.name ? this.change({ name: t }) : e.target.value = this.task.name;
	}
	onNote(e) {
		let t = e.target.value;
		t !== this.task.note && this.change({ note: t || null });
	}
	onTags(e) {
		let t = Le(e.target.value);
		t.join(",") !== this.task.tags.join(",") && this.change({ tags: t });
	}
	setDue(e) {
		e !== this.task.due_date && this.change({ due_date: e });
	}
	render() {
		let e = this.task, t = this.snap, n = e.project_uid ? t.notes.filter((t) => t.project_uid === e.project_uid) : [], r = t.projects.find((t) => t.uid === e.project_uid), i = e.due_date ? q(t.today, e.due_date) : null;
		return M`
      <div class="bar">
        <button class="icon" title="Close" @click=${this.close}>${U("back")}</button>
        <span class="spacer"></span>
        <button class="icon danger" title="Delete task" @click=${this.deleteTask}>
          ${U("delete")}
        </button>
      </div>

      <div class="content">
        <div class="name-row">
          <button
            class="check ${e.done ? "checked" : ""}"
            title=${e.done ? "Reopen" : "Mark done"}
            @click=${() => this.change({ status: e.done ? $.NOT_STARTED : $.DONE })}
          >
            ${e.done ? U("check", 18) : P}
          </button>
          <input
            class="name ${e.done ? "done" : ""}"
            .value=${e.name}
            @change=${this.onName}
            @keydown=${(e) => {
			e.key === "Enter" && e.target.blur();
		}}
          />
        </div>
        ${e.recurring ? M`<div class="hint">${U("repeat", 16)} Recurring task (edit recurrence in tududi)</div>` : P}

        <div class="grid">
          <label>Due date</label>
          <div class="due">
            <input
              type="date"
              .value=${e.due_date ?? ""}
              @change=${(e) => this.setDue(e.target.value || null)}
            />
            ${i === null ? P : M`<span class="badge ${Oe(i)}">${X(t.today, e.due_date, this.language)}</span>`}
            <div class="quick">
              <button class="chip" @click=${() => this.setDue(t.today)}>Today</button>
              <button class="chip" @click=${() => this.setDue(J(t.today, 1))}>Tomorrow</button>
              <button class="chip" @click=${() => this.setDue(J(t.today, 7))}>+1 week</button>
              ${e.due_date ? M`<button class="chip" @click=${() => this.setDue(null)}>Clear</button>` : P}
            </div>
          </div>

          <label>Status</label>
          <select
            @change=${(e) => this.change({ status: Number(e.target.value) })}
          >
            ${Ue.map((t) => M`<option value=${t} ?selected=${t === e.status}>${Ve[t]}</option>`)}
          </select>

          <label>Priority</label>
          <select
            @change=${(e) => {
			let t = e.target.value;
			this.change({ priority: t === "" ? null : Number(t) });
		}}
          >
            <option value="" ?selected=${e.priority === null}>None</option>
            ${[
			0,
			1,
			2
		].map((t) => M`<option value=${t} ?selected=${t === e.priority}>${He[t]}</option>`)}
          </select>

          <label>Project</label>
          <select
            @change=${(e) => this.change({ project_uid: e.target.value || null })}
          >
            <option value="" ?selected=${!e.project_uid}>No project</option>
            ${t.projects.map((t) => M`<option value=${t.uid} ?selected=${t.uid === e.project_uid}>${t.name}</option>`)}
          </select>

          <label>Assigned to</label>
          <select
            @change=${(e) => this.change({ assigned_to: e.target.value || null })}
          >
            <option value="" ?selected=${!e.assigned_to}>Nobody</option>
            ${t.people.map((t) => M`<option value=${t.uid} ?selected=${t.uid === e.assigned_to}>
                  ${t.name}${t.is_self ? " (me)" : ""}
                </option>`)}
          </select>

          <label>Tags</label>
          <div>
            <input
              list="tududi-tags"
              placeholder="e.g. invoice, car"
              .value=${e.tags.join(", ")}
              @change=${this.onTags}
            />
            <datalist id="tududi-tags">
              ${t.tags.map((e) => M`<option value=${e}></option>`)}
            </datalist>
          </div>
        </div>

        <label class="block">Note</label>
        <textarea
          rows="6"
          placeholder="Details, invoice amount, reference number…"
          .value=${e.note}
          @change=${this.onNote}
        ></textarea>

        ${r ? M`<tududi-notes
              .notes=${n}
              heading=${`Notes · ${r.name}`}
              can-add
            ></tududi-notes>` : P}
      </div>
    `;
	}
	static {
		this.styles = o`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .bar {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      border-bottom: 1px solid var(--divider-color);
      min-height: 48px;
      box-sizing: border-box;
    }
    .spacer {
      flex: 1;
    }
    .content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input.name {
      font-size: 1.3em;
      font-weight: 500;
      border: 1px solid transparent;
      background: transparent;
      padding: 6px;
    }
    input.name:hover,
    input.name:focus {
      border-color: var(--divider-color);
    }
    input.name.done {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 10px 12px;
      align-items: center;
    }
    label {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    label.block {
      margin-bottom: -6px;
    }
    .due {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .due input {
      width: auto;
    }
    .quick {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      width: 100%;
    }
    input,
    select,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      color-scheme: light dark;
    }
    textarea {
      resize: vertical;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
    button.icon.danger {
      color: var(--error-color);
    }
    button.chip {
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 2px 10px;
      font-size: 0.85em;
    }
    button.chip:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .check {
      flex: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .badge {
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    }
    .badge.overdue {
      background: var(--error-color);
      color: #fff;
    }
    .badge.today {
      background: var(--warning-color, #ffa600);
      color: #fff;
    }
    .badge.soon {
      color: var(--primary-color);
    }
    tududi-notes {
      margin-top: 8px;
    }
  `;
	}
};
customElements.define("tududi-task-detail", We);
//#endregion
//#region src/tududi-panel.ts
var Ge = "tududi-panel-entry", Ke = class extends V {
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			route: { attribute: !1 },
			panel: { attribute: !1 },
			entries: { state: !0 },
			entryId: { state: !0 },
			serverSnap: { state: !0 },
			overrides: { state: !0 },
			selectedUid: { state: !0 },
			search: { state: !0 },
			quickAdd: { state: !0 },
			toast: { state: !0 },
			loading: { state: !0 },
			refreshing: { state: !0 }
		};
	}
	constructor() {
		super(), this.api = new Ee(() => this.hass), this.initialized = !1, this.narrow = !1, this.overrides = /* @__PURE__ */ new Map(), this.search = "", this.quickAdd = "", this.loading = !0, this.refreshing = !1;
	}
	connectedCallback() {
		super.connectedCallback(), this.entryId && !this.unsubscribe && this.subscribe(this.entryId);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribeNow();
	}
	willUpdate(e) {
		e.has("hass") && this.hass && !this.initialized && (this.initialized = !0, this.init());
	}
	async init() {
		try {
			let e = await this.api.entries();
			if (this.entries = e, !e.length) {
				this.loading = !1;
				return;
			}
			let t = localStorage.getItem(Ge), n = e.find((e) => e.entry_id === t) ?? e.find((e) => e.linked) ?? e[0];
			this.selectEntry(n.entry_id);
		} catch (e) {
			this.loading = !1, this.showToast(`Could not load tududi accounts: ${H(e)}`);
		}
	}
	selectEntry(e) {
		e !== this.entryId && (localStorage.setItem(Ge, e), this.unsubscribeNow(), this.entryId = e, this.serverSnap = void 0, this.overrides = /* @__PURE__ */ new Map(), this.selectedUid = void 0, this.loading = !0, this.subscribe(e));
	}
	subscribe(e) {
		this.unsubscribe = this.api.subscribe(e, (e) => {
			e.entry_id === this.entryId && (this.serverSnap = e, this.loading = !1);
		}), this.unsubscribe.catch((e) => {
			this.loading = !1, this.unsubscribe = void 0, this.showToast(`Could not load tasks: ${H(e)}`);
		});
	}
	unsubscribeNow() {
		let e = this.unsubscribe;
		this.unsubscribe = void 0, e?.then((e) => e()).catch(() => void 0);
	}
	get snap() {
		let e = this.serverSnap;
		if (!e || this.overrides.size === 0) return e;
		let t = e;
		for (let [e, n] of this.overrides) t = n === null ? {
			...t,
			tasks: t.tasks.filter((t) => t.uid !== e)
		} : ze(t, n);
		return t;
	}
	get view() {
		return Ie(this.route?.path);
	}
	get language() {
		return this.hass?.locale?.language ?? this.hass?.language ?? "en";
	}
	navigate(e) {
		let t = this.route?.prefix ?? "/tududi";
		history.pushState(null, "", `${t}/${encodeURIComponent(e)}`), window.dispatchEvent(new CustomEvent("location-changed")), this.selectedUid = void 0, this.search = "";
	}
	showToast(e) {
		this.toast = e, window.clearTimeout(this.toastTimer), this.toastTimer = window.setTimeout(() => this.toast = void 0, 6e3);
	}
	setOverride(e, t) {
		let n = new Map(this.overrides);
		t === void 0 ? n.delete(e) : n.set(e, t), this.overrides = n;
	}
	async updateTask(e, t) {
		let n = this.snap, r = this.entryId, i = n?.tasks.find((t) => t.uid === e);
		if (!n || !r || !i) return;
		let a = {
			...i,
			...t
		};
		t.status !== void 0 && (a.done = t.status === $.DONE, a.open = ![
			$.DONE,
			$.ARCHIVED,
			$.CANCELLED
		].includes(t.status)), this.setOverride(e, a);
		try {
			await this.api.updateTask(r, e, t);
		} catch (e) {
			this.showToast(`Saving failed: ${H(e)}`);
		} finally {
			this.setOverride(e, void 0);
		}
	}
	toggleDone(e) {
		this.updateTask(e.uid, { status: e.done ? $.NOT_STARTED : $.DONE });
	}
	async deleteTask(e) {
		if (this.entryId) {
			this.setOverride(e, null), this.selectedUid = void 0;
			try {
				await this.api.deleteTask(this.entryId, e);
			} catch (e) {
				this.showToast(`Deleting failed: ${H(e)}`);
			} finally {
				this.setOverride(e, void 0);
			}
		}
	}
	async addTask() {
		let e = this.quickAdd.trim(), t = this.snap;
		if (e && t && this.entryId) {
			this.quickAdd = "";
			try {
				await this.api.createTask(this.entryId, e, Fe(t, this.view));
			} catch (t) {
				this.quickAdd = e, this.showToast(`Adding failed: ${H(t)}`);
			}
		}
	}
	async saveNote(e, t) {
		if (this.entryId) try {
			e.uid ? await this.api.updateNote(this.entryId, e.uid, {
				title: e.title,
				content: e.content
			}) : await this.api.createNote(this.entryId, e.title, {
				content: e.content,
				...t ? { project_uid: t } : {}
			});
		} catch (e) {
			this.showToast(`Saving note failed: ${H(e)}`);
		}
	}
	async deleteNote(e) {
		if (this.entryId) try {
			await this.api.deleteNote(this.entryId, e);
		} catch (e) {
			this.showToast(`Deleting note failed: ${H(e)}`);
		}
	}
	async refresh() {
		if (this.entryId) {
			this.refreshing = !0;
			try {
				await this.api.refresh(this.entryId);
			} catch (e) {
				this.showToast(`Refresh failed: ${H(e)}`);
			} finally {
				this.refreshing = !1;
			}
		}
	}
	render() {
		let e = this.snap, t = e?.tasks.find((e) => e.uid === this.selectedUid);
		return M`
      <div class="toolbar">
        ${this.narrow ? M`<button
              class="icon"
              title="Menu"
              @click=${() => this.dispatchEvent(new CustomEvent("hass-toggle-menu", {
			bubbles: !0,
			composed: !0
		}))}
            >
              ${U("menu")}
            </button>` : P}
        <div class="title">Tududi</div>
        ${this.entries && this.entries.length > 1 ? M`<select
              class="entry"
              @change=${(e) => this.selectEntry(e.target.value)}
            >
              ${this.entries.map((e) => M`<option value=${e.entry_id} ?selected=${e.entry_id === this.entryId}>
                    ${e.title}
                  </option>`)}
            </select>` : P}
        <button
          class="icon ${this.refreshing ? "spin" : ""}"
          title="Refresh from tududi"
          ?disabled=${!this.entryId}
          @click=${this.refresh}
        >
          ${U("refresh")}
        </button>
      </div>
      ${this.renderBody(e, t)}
      ${this.toast ? M`<div class="toast" @click=${() => this.toast = void 0}>${this.toast}</div>` : P}
    `;
	}
	renderBody(e, t) {
		return this.entries && this.entries.length === 0 ? M`<div class="message">
        <h2>No tududi account</h2>
        <p>
          No tududi account is linked to your Home Assistant user. Ask an administrator to add
          the Tududi integration with your API key and select you as its Home Assistant user.
        </p>
      </div>` : this.loading || !e ? M`<div class="message">Loading…</div>` : M`
      <div class="body ${this.narrow ? "narrow" : ""} ${t ? "has-detail" : ""}">
        ${this.narrow ? P : this.renderNav(e)}
        <main class="list">
          ${this.narrow ? this.renderNarrowNav(e) : P}
          ${e.last_update_success ? P : M`<div class="warning">tududi is unreachable; showing cached tasks.</div>`}
          ${this.renderList(e)}
        </main>
        ${t ? M`<aside class="detail">
              <tududi-task-detail
                .task=${t}
                .snap=${e}
                .language=${this.language}
                @close=${() => this.selectedUid = void 0}
                @task-change=${(e) => this.updateTask(e.detail.uid, e.detail.fields)}
                @task-delete=${(e) => this.deleteTask(e.detail.uid)}
                @note-save=${(e) => this.saveNote(e.detail, t.project_uid)}
                @note-delete=${(e) => this.deleteNote(e.detail.uid)}
              ></tududi-task-detail>
            </aside>` : P}
      </div>
    `;
	}
	renderNav(e) {
		let t = (e, t, n) => M`
      <button class="nav-item ${this.view === e ? "active" : ""}" @click=${() => this.navigate(e)}>
        <span class="nav-label">${t}</span>
        ${n ? M`<span class="count">${n}</span>` : P}
      </button>
    `;
		return M`
      <nav class="sidebar">
        ${W.map((n) => t(n.id, n.label, n.id === "done" ? void 0 : Z(e, n.id)))}
        ${e.projects.length ? M`<div class="nav-section">Projects</div>
              ${e.projects.map((n) => t(`project:${n.uid}`, n.name, Z(e, `project:${n.uid}`)))}` : P}
        ${e.tags.length ? M`<div class="nav-section">Tags</div>
              ${e.tags.map((n) => t(`tag:${n}`, `#${n}`, Z(e, `tag:${n}`)))}` : P}
      </nav>
    `;
	}
	renderNarrowNav(e) {
		let t = this.view.startsWith("project:") || this.view.startsWith("tag:");
		return M`
      <div class="chips">
        ${W.map((t) => {
			let n = t.id === "done" ? 0 : Z(e, t.id);
			return M`<button
            class="chip ${this.view === t.id ? "active" : ""}"
            @click=${() => this.navigate(t.id)}
          >
            ${t.label}${n ? M` <span class="count">${n}</span>` : P}
          </button>`;
		})}
        <select
          class="chip ${t ? "active" : ""}"
          @change=${(e) => {
			let t = e.target.value;
			t && this.navigate(t);
		}}
        >
          <option value="" ?selected=${!t}>Projects & tags…</option>
          ${e.projects.map((e) => M`<option value=${`project:${e.uid}`} ?selected=${this.view === `project:${e.uid}`}>
                ${e.name}
              </option>`)}
          ${e.tags.map((e) => M`<option value=${`tag:${e}`} ?selected=${this.view === `tag:${e}`}>#${e}</option>`)}
        </select>
      </div>
    `;
	}
	renderList(e) {
		let t = this.view, n = Pe(e, t, Ne(e, t).filter((e) => Me(e, this.search)), this.language), r = t.startsWith("project:") ? t.slice(8) : null, i = t !== "done" && t !== "overdue";
		return M`
      <div class="list-header">
        <h1>${Q(e, t)}</h1>
        <input
          class="search"
          type="search"
          placeholder="Search"
          .value=${this.search}
          @input=${(e) => this.search = e.target.value}
        />
      </div>
      ${i ? M`<form
            class="quick-add"
            @submit=${(e) => {
			e.preventDefault(), this.addTask();
		}}
          >
            ${U("plus")}
            <input
              placeholder=${this.quickAddPlaceholder(e, t)}
              .value=${this.quickAdd}
              @input=${(e) => this.quickAdd = e.target.value}
            />
          </form>` : P}
      ${r ? M`<tududi-notes
            class="project-notes"
            .notes=${e.notes.filter((e) => e.project_uid === r)}
            heading="Project notes"
            can-add
            @note-save=${(e) => this.saveNote(e.detail, r)}
            @note-delete=${(e) => this.deleteNote(e.detail.uid)}
          ></tududi-notes>` : P}
      ${n.length === 0 ? M`<div class="empty">${this.search ? "No matching tasks." : "Nothing here. 🎉"}</div>` : n.map((n) => M`
              <section>
                ${n.label ? M`<h2 class="group ${n.key}">${n.label}<span>${n.tasks.length}</span></h2>` : P}
                ${n.tasks.map((n) => this.renderTask(e, n, t))}
              </section>
            `)}
    `;
	}
	quickAddPlaceholder(e, t) {
		return t === "today" ? "Add a task due today" : t === "upcoming" ? "Add a task due tomorrow" : t === "invoices" ? `Add an invoice (tagged #${e.reminder_tag})` : t.startsWith("project:") ? `Add a task to ${Q(e, t)}` : t.startsWith("tag:") ? `Add a task tagged ${Q(e, t)}` : "Add a task";
	}
	renderTask(e, t, n) {
		let r = n.startsWith("project:") ? void 0 : e.projects.find((e) => e.uid === t.project_uid), i = t.assigned_to && t.assigned_to !== e.self_person ? e.people.find((e) => e.uid === t.assigned_to) : void 0, a = t.due_date ? q(e.today, t.due_date) : null, o = n.startsWith("tag:") ? n.slice(4).toLocaleLowerCase() : null, s = t.tags.filter((e) => e.toLocaleLowerCase() !== o);
		return M`
      <div
        class="task ${t.uid === this.selectedUid ? "selected" : ""} ${t.open ? "" : "closed"}"
        @click=${() => this.selectedUid = t.uid}
      >
        <button
          class="check ${t.done ? "checked" : ""} ${t.priority === 2 ? "high" : ""}"
          title=${t.done ? "Reopen" : "Mark done"}
          @click=${(e) => {
			e.stopPropagation(), this.toggleDone(t);
		}}
        >
          ${t.done ? U("check", 16) : P}
        </button>
        <div class="task-main">
          <div class="task-name">${t.name}</div>
          <div class="meta">
            ${a !== null && t.open ? M`<span class="due ${Oe(a)}">${X(e.today, t.due_date, this.language)}</span>` : P}
            ${t.status === $.IN_PROGRESS ? M`<span class="status">In progress</span>` : P}
            ${t.status === $.WAITING ? M`<span class="status">Waiting</span>` : P}
            ${r ? M`<span class="project">${r.name}</span>` : P}
            ${s.map((e) => M`<span class="tag">#${e}</span>`)}
            ${t.note ? M`<span class="has-note" title=${t.note}>${U("note", 14)}</span>` : P}
            ${t.recurring ? M`<span class="has-note">${U("repeat", 14)}</span>` : P}
          </div>
        </div>
        ${i ? M`<span class="avatar" title=${`Assigned to ${i.name}`}>${Re(i.name)}</span>` : P}
      </div>
    `;
	}
	static {
		this.styles = o`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
      position: relative;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--header-height, 56px);
      padding: 0 8px 0 16px;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
      box-sizing: border-box;
      flex: none;
    }
    .toolbar .title {
      flex: 1;
      font-size: 20px;
      font-weight: 400;
    }
    .toolbar .icon {
      color: inherit;
    }
    .toolbar select.entry {
      font: inherit;
      color: inherit;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .toolbar select.entry option {
      color: var(--primary-text-color);
      background: var(--card-background-color);
    }
    button.icon {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      color: var(--primary-text-color);
    }
    button.icon:hover {
      background: rgba(127, 127, 127, 0.15);
    }
    button.icon.spin svg {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .message {
      padding: 32px;
      max-width: 560px;
      margin: 0 auto;
      color: var(--secondary-text-color);
    }
    .body {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    .sidebar {
      width: 220px;
      flex: none;
      overflow-y: auto;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color);
      box-sizing: border-box;
    }
    .nav-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px 12px;
      border-radius: 8px;
      text-align: left;
    }
    .nav-item:hover {
      background: rgba(127, 127, 127, 0.1);
    }
    .nav-item.active {
      background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
      color: var(--primary-color);
      font-weight: 500;
    }
    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .nav-section {
      margin: 16px 12px 4px;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color);
    }
    .list {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 16px 24px 48px;
      box-sizing: border-box;
    }
    .body.narrow .list {
      padding: 8px 12px 48px;
    }
    .detail {
      width: 420px;
      flex: none;
      border-left: 1px solid var(--divider-color);
      min-height: 0;
    }
    .body.narrow .detail {
      position: absolute;
      inset: 0;
      width: auto;
      z-index: 5;
      border: none;
    }
    .chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 0 8px;
      scrollbar-width: none;
    }
    .chip {
      flex: none;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 4px 12px;
      font: inherit;
      font-size: 0.9em;
    }
    .chip.active {
      border-color: var(--primary-color);
      color: var(--primary-color);
      font-weight: 500;
    }
    .list-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .list-header h1 {
      flex: 1;
      font-size: 1.6em;
      font-weight: 400;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    input.search,
    .quick-add input {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      box-sizing: border-box;
    }
    input.search {
      width: 180px;
    }
    .quick-add {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 2px 10px;
      margin-bottom: 16px;
      color: var(--secondary-text-color);
    }
    .quick-add:focus-within {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .quick-add input {
      flex: 1;
      border: none;
      background: none;
      padding: 10px 0;
      outline: none;
    }
    .project-notes {
      margin-bottom: 16px;
    }
    .warning {
      background: var(--warning-color, #ffa600);
      color: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .empty {
      text-align: center;
      color: var(--secondary-text-color);
      padding: 48px 0;
    }
    h2.group {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 0.85em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
      margin: 20px 0 6px;
    }
    h2.group span {
      font-weight: 400;
    }
    h2.group.overdue {
      color: var(--error-color);
    }
    .task {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: border-color 0.1s;
    }
    .task:hover {
      border-color: var(--primary-color);
    }
    .task.selected {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .task.closed .task-name {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .check {
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.high {
      border-color: var(--error-color);
    }
    .check:hover {
      border-color: var(--success-color, #43a047);
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .task-main {
      flex: 1;
      min-width: 0;
    }
    .task-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .meta:empty {
      display: none;
    }
    .due.overdue {
      color: var(--error-color);
      font-weight: 500;
    }
    .due.today {
      color: var(--warning-color, #ffa600);
      font-weight: 500;
    }
    .due.soon {
      color: var(--primary-color);
    }
    .tag {
      color: var(--primary-color);
    }
    .has-note {
      display: inline-flex;
    }
    .avatar {
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-color, #ff9800);
      color: #fff;
      font-size: 0.75em;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: var(--primary-text-color);
      color: var(--primary-background-color);
      padding: 10px 16px;
      border-radius: 8px;
      max-width: 90%;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }
  `;
	}
};
customElements.define("tududi-panel", Ke);
//#endregion
