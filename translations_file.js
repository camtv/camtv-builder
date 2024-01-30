const axios = require('axios');
const https = require('https');
const sheets = require('@googleapis/sheets');

class TranslationsFile {

	constructor(url, KeyLang = "en", removeKeyLang = true) {
		this.url = url
		this.missingKeys = [];
		this.usedKeys = [];
		this.missingKeysUpdate = false;
		this.usedKeysUpdate = false;
		this.removeKeyLang = removeKeyLang;
		this.Data = {
			"Langs": [],
			"KeyLang": KeyLang,
			"Translations": []
		}
		this.agent = new https.Agent({
			rejectUnauthorized: false
		});
	}

	async Get() {
		if (this.url != null && this.url != '') {
			try {
				// let json = await axios(this.url, { headers: { 'Accept': 'application/json' }, httpsAgent: this.agent })
				// let kvLang = json.data[0];
				// this.Data.Langs = Object.values(kvLang)

				// if (this.removeKeyLang) {
				// 	this.Data.Langs = this.Data.Langs.filter(v => v !== this.Data.KeyLang);
				// }

				// json.data.splice(0, 1)

				// this.Data.Translations = json.data;

				const auth = new sheets.auth.GoogleAuth({
					keyFilename: 'credentials.json',
					// Scopes can be specified either as an array or as a single, space-delimited string.
					scopes: ['https://www.googleapis.com/auth/spreadsheets']
				});

				const authClient = await auth.getClient();

				const spreadsheetId = '18KCeYmR0r03s0vugL34Q5Zxk40NbfqOrEi5bDRIimf4';

				const client = await sheets.sheets({
					version: 'v4',
					auth: authClient
				});

				const response = await client.spreadsheets.values.get({
					spreadsheetId,
					range: 'Foglio1!B:H'
				})

				this.Data.Translations = response.data.values.slice();
				this.Data.Langs = this.Data.Translations.shift(); // removing heading from translations (languages)

			} catch (ex) {
				console.log('\x1b[31m%s\x1b[0m', "Error on get translations file: " + ex)
			}
		} else {
			console.log("Missing --translations-url-download parameter")
		}
		return this.Data;
	}

	SetUsed(key, FileName) {
		if (this.usedKeys.includes(key) == false) {
			this.usedKeys.push({
				"key": key,
				"file": FileName
			})
		}
	}

	SetMissing(key) {
		if (this.missingKeys.includes(key) == false) {
			var hasKey = this.Data.Translations.some(function (element) {
				if (element.key == key) {
					return true;
				}
			});

			if (hasKey == false) {
				this.missingKeys.push(key)
			}
		}
	}

	UpdateMissingKeys() {
		if (this.missingKeys.length > 0) {
			var keys = this.missingKeys.join("%_%");
			if (this.url != null && this.url != '') {
				if (this.missingKeysUpdate == false) {
					this.missingKeysUpdate = true
					try {
						// axios.post(this.url, { "key": this.missingKeys })
					} catch (ex) {
						console.log("UpdateMissingKeys failed: " + ex)
						console.log(this.missingKeys);
					}
				}
			} else {
				console.log("Cannot set Missing Translation Key: " + keys)
			}
		}
	}

	UpdateUsedKeys() {
		if (this.usedKeys.length > 0) {
			var keys = this.usedKeys.join(",");
			if (this.url != null && this.url != '') {
				if (this.usedKeysUpdate == false) {
					this.usedKeysUpdate = true
					try {
						// axios.post(this.url, {"ukey": this.usedKeys})
					} catch (ex) {
						console.log("UpdateUsedKeys failed")
					}
				}
			} else {
				console.log("Cannot set Used Translation Key: " + keys)
			}
		}
	}
}

module.exports = TranslationsFile