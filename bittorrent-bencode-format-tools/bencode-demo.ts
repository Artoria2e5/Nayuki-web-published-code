/* 
 * BitTorrent bencode decoder demo (TypeScript)
 * 
 * Copyright (c) 2019 Project Nayuki. (MIT License)
 * https://www.nayuki.io/page/bittorrent-bencode-format-tools
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */


namespace app {
	
	let fileElem = document.querySelector("article input[type='file']") as HTMLInputElement;
	fileElem.addEventListener("change", render);
	
	
	async function render(): Promise<void> {
		const files = fileElem.files;
		if (files === null)
			return;
		const bytes = await new Promise<Uint8Array>(resolve => {
			let reader = new FileReader();
			reader.onload = () =>
				resolve(new Uint8Array(reader.result as ArrayBuffer));
			reader.readAsArrayBuffer(files[0]);
		});
		
		let rootElem = document.querySelector("article #file-dissection") as HTMLElement;
		while (rootElem.firstChild !== null)
			rootElem.removeChild(rootElem.firstChild);
		
		try {
			const rootItem = new BencodeParser(bytes).parseRoot();
			rootElem.appendChild(toHtml(rootItem));
			
		} catch (e) {
			rootElem.textContent = "Error: " + e.toString();
		}
	}
	
	
	function toHtml(item: BencodeItem): Node {
		function appendText(container: Node, text: string): void {
			container.appendChild(document.createTextNode(text));
		}
		
		function appendElem(container: Node, tagName: string): HTMLElement {
			let result = document.createElement(tagName);
			return container.appendChild(result);
		}
		
		let result = document.createElement("div");
		result.classList.add("item");
		if (item instanceof BencodeInt) {
			const s = "Integer: " + item.value.replace(/-/, "\u2212")
			appendText(result, s);
		}
		else if (item instanceof BencodeBytes) {
			appendText(result, `Byte string (${item.value.length}) `);
			try {
				const s: string = decodeUtf8(item.value);
				appendText(result, "(text): " + s);
			} catch (e) {
				let hex: Array<string> = [];
				for (let c of item.value) {
					let s: string = c.charCodeAt(0).toString(16).toUpperCase();
					while (s.length < 2)
						s = "0" + s;
					hex.push(s);
				}
				appendText(result, "(binary): " + hex.join(" "));
			}
		}
		else if (item instanceof BencodeList || item instanceof BencodeDict) {
			let table = document.createElement("table");
			let tbody = appendElem(table, "tbody");
			
			function addRow(a: string, b: Node): void {
				let tr = appendElem(tbody, "tr");
				let td = appendElem(tr, "td");
				td.textContent = a;
				td = appendElem(tr, "td");
				td.appendChild(b);
			}
			
			if (item instanceof BencodeList) {
				appendText(result, "List:");
				table.classList.add("list");
				result.appendChild(table);
				item.array.forEach((val, i) =>
					addRow(i.toString(), toHtml(val)));
			} else if (item instanceof BencodeDict) {
				appendText(result, "Dictionary:");
				table.classList.add("dict");
				result.appendChild(table);
				for (const key of item.keys) {
					const val = item.map.get(key);
					if (val === undefined)
						throw "Assertion error";
					addRow(key, toHtml(val));
				}
			}
			else
				throw "Assertion error";
		}
		else
			throw "Assertion error";
		return result;
	}
	
	
	function decodeUtf8(bytes: string): string {
		function cb(i: number): number {
			if (i < 0 || i >= bytes.length)
				throw "Missing continuation bytes";
			const result: number = bytes.charCodeAt(i);
			if ((result & 0b11000000) != 0b10000000)
				throw "Invalid continuation byte value";
			return result & 0b00111111;
		}
		
		let result: string = "";
		for (let i = 0; i < bytes.length; i++) {
			const lead: number = bytes.charCodeAt(i);
			if (lead < 0b10000000)  // Single byte ASCII (0xxxxxxx)
				result += bytes.charAt(i);
			else if (lead < 0b11000000)  // Continuation byte (10xxxxxx)
				throw "Invalid leading byte";
			else if (lead < 0b11100000) {  // Two bytes (110xxxxx 10xxxxxx)
				const c: number = (lead & 0b00011111) << 6 | cb(i + 1) << 0;
				if (c < (1 << 7))
					throw "Over-long UTF-8 sequence";
				result += String.fromCharCode(c);
				i += 1;
			} else if (lead < 0b11110000) {  // Three bytes (1110xxxx 10xxxxxx 10xxxxxx)
				const c: number = (lead & 0b00001111) << 12 | cb(i + 1) << 6 | cb(i + 2) << 0;
				if (c < (1 << 11))
					throw "Over-long UTF-8 sequence";
				if (0xD800 <= c && c < 0xE000)
					throw "Invalid UTF-8 containing UTF-16 surrogate";
				result += String.fromCharCode(c);
				i += 2;
			} else if (lead < 0b11111000) {  // Four bytes (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
				let c: number = (lead & 0b00000111) << 18 | cb(i + 1) << 12 | cb(i + 2) << 6 | cb(i + 3);
				if (c < (1 << 16))
					throw "Over-long UTF-8 sequence";
				if (c >= 0x110000)
					throw "UTF-8 code point out of range";
				c -= 0x10000;
				result += String.fromCharCode(0xD800 | (c >>> 10), 0xDC00 | (c & 0b1111111111));
				i += 3;
			} else
				throw "Invalid leading byte";
		}
		return result;
	}
	
	
	
	class BencodeParser {
		
		private index: number = 0;
		
		
		public constructor(
			private readonly array: Uint8Array) {}
		
		
		public parseRoot(): BencodeItem {
			if (this.index != 0)
				throw "Invalid parser state";
			const b: number = this.readByte();
			if (b == -1)
				throw "Unexpected end of data at byte offset " + this.index;
			let result: BencodeItem = this.parseItem(b);
			if (this.readByte() != -1)
				throw "Unexpected extra data at byte offset " + (this.index - 1);
			return result;
		}
		
		
		private parseItem(leadByte: number): BencodeItem {
			if (leadByte == cc("i"))
				return this.parseInt();
			
			else if (cc("0") <= leadByte && leadByte <= cc("9"))
				return this.parseBytes(leadByte);
			
			else if (leadByte == cc("l")) {
				let array: Array<BencodeItem> = [];
				while (true) {
					const b: number = this.readByte();
					if (b == cc("e"))
						break;
					array.push(this.parseItem(b));
				}
				return new BencodeList(array);
			}
			
			else if (leadByte == cc("d")) {
				let map = new Map<string,BencodeItem>();
				let keys: Array<string> = [];
				while (true) {
					let b: number = this.readByte();
					if (b == cc("e"))
						break;
					const key: string = this.parseBytes(b).value;
					if (keys.length > 0 && key <= keys[keys.length - 1])
						throw "Misordered dictionary key at byte offset " + (this.index - 1);
					keys.push(key);
					
					b = this.readByte();
					if (b == -1)
						throw "Unexpected end of data at byte offset " + this.index;
					map.set(key, this.parseItem(b));
				}
				return new BencodeDict(map, keys);
			}
			else
				throw "Unexpected item type at byte offset " + (this.index - 1);
		}
		
		
		private parseInt(): BencodeInt {
			let str: string = "";
			while (true) {
				const b: number = this.readByte();
				if (b == -1)
					throw "Unexpected end of data at byte offset " + this.index;
				
				const c: string = String.fromCharCode(b);
				if (c == "e")
					break;
				
				let ok: boolean;
				if (str == "")
					ok = c == "-" || "0" <= c && c <= "9";
				else if (str == "-")
					ok = "1" <= c && c <= "9";
				else if (str == "0")
					ok = false;
				else  // str starts with [123456789] or -[123456789]
					ok = "0" <= c && c <= "9";
				
				if (ok)
					str += c;
				else
					throw "Unexpected integer character at byte offset " + (this.index - 1);
			}
			if (str == "" || str == "-")
				throw "Invalid integer syntax at byte offset " + (this.index - 1);
			if (!/^(0|-?[1-9][0-9]*)$/.test(str))
				throw "Assertion error";
			return new BencodeInt(str);
		}
		
		
		private parseBytes(leadByte: number): BencodeBytes {
			const length = this.parseNatural(leadByte);
			let result: string = "";
			for (let i = 0; i < length; i++) {
				const b: number = this.readByte();
				if (b == -1)
					throw "Unexpected end of data at byte offset " + this.index;
				result += String.fromCharCode(b);
			}
			return new BencodeBytes(result);
		}
		
		
		private parseNatural(leadByte: number): number {
			let str: string = "";
			let b: number = leadByte;
			while (true) {
				if (b == -1)
					throw "Unexpected end of data at byte offset " + this.index;
				const c: string = String.fromCharCode(b);
				if (c == ":")
					break;
				else if (str != "0" && "0" <= c && c <= "9")
					str += c;
				else
					throw "Unexpected integer character at byte offset " + (this.index - 1);
				b = this.readByte();
			}
			if (str == "")
				throw "Invalid integer syntax at byte offset " + (this.index - 1);
			if (!/^(0|[1-9][0-9]*)$/.test(str))
				throw "Assertion error";
			return parseInt(str, 10);
		}
		
		
		private readByte(): number {
			if (this.index >= this.array.length)
				return -1;
			const result: number = this.array[this.index];
			this.index++;
			return result;
		}
		
	}
	
	
	function cc(s: string): number {
		if (s.length != 1)
			throw "Invalid string length";
		return s.charCodeAt(0);
	}
	
	
	
	abstract class BencodeItem {}
	
	
	class BencodeInt extends BencodeItem {
		public constructor(
				public readonly value: string) {
			super();
		}
	}
	
	
	class BencodeBytes extends BencodeItem {
		public constructor(
				public readonly value: string) {
			super();
		}
	}
	
	
	class BencodeList extends BencodeItem {
		public constructor(
				public readonly array: Array<BencodeItem>) {
			super();
		}
	}
	
	
	class BencodeDict extends BencodeItem {
		public constructor(
				public readonly map: Map<string,BencodeItem>,
				public readonly keys: Array<string>) {
			super();
		}
	}
	
}