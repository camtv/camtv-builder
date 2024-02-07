const axios = require('axios');
const https = require('https');
const sheets = require('@googleapis/sheets');

class TranslationsFile {

	constructor(spreadsheetId, KeyLang = "it", removeKeyLang = true, markUnusedTranslations = false) {
		this.spreadsheetId = spreadsheetId;
		this.markUnusedTranslations = markUnusedTranslations;
		this.missingKeys = [];
		this.usedKeys = [];
		this.missingKeysUpdate = false;
		this.usedKeysUpdate = false;
		this.removeKeyLang = removeKeyLang;
		this.Data = {
			"Langs": [],
			"KeyLang": KeyLang,
			"Translations": [],
			"UnusedTranslations": []
		}
		this.client = null;
	}

	async Get() {
		if (this.spreadsheetId != null && this.spreadsheetId != '') {
			try {

				const auth = new sheets.auth.GoogleAuth({
					keyFilename: 'credentials.json',
					// Scopes can be specified either as an array or as a single, space-delimited string.
					scopes: ['https://www.googleapis.com/auth/spreadsheets']
				});

				const authClient = await auth.getClient();

				this.client = sheets.sheets({
					version: 'v4',
					auth: authClient
				});

				this.response = await this.client.spreadsheets.values.get({
					spreadsheetId: this.spreadsheetId,
					range: 'Foglio1!B:H'
				})

				this.Data.Translations = this.response.data.values.slice();
				this.Data.UnusedTranslations = this.response.data.values.slice();
				this.Data.Langs = this.Data.Translations.shift(); // removing heading from translations (languages)

			} catch (ex) {
				console.log('\x1b[31m%s\x1b[0m', "Error on get translations file: " + ex)
			}
		} else {
			console.log("Missing --google-spreadsheet-id parameter")
		}
		return this.Data;
	}

	SetUsed(key, FileName) {
		if (this.Data.UnusedTranslations.findIndex(translation => translation[0] == key) != -1)
			this.Data.UnusedTranslations.splice(this.Data.UnusedTranslations.findIndex(translation => translation[0] == key), 1);
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
			if (this.spreadsheetId != null && this.spreadsheetId != '') {
				if (this.missingKeysUpdate == false) {
					this.missingKeysUpdate = true
					try {
						this.client.spreadsheets.values.append({
							spreadsheetId: this.spreadsheetId,
							range: `Foglio1!B${this.response.data.values.length + 1}`,
							valueInputOption: 'USER_ENTERED',
							resource: {
								values: this.missingKeys.map(missingTranslation => [missingTranslation])
							}
						})
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
		if (this.Data.UnusedTranslations.length > 0) {
			if (this.spreadsheetId != null && this.spreadsheetId != '' && this.markUnusedTranslations) {
				if (this.usedKeysUpdate == false) {
					this.usedKeysUpdate = true
					try {
						this.Data.UnusedTranslations.shift();
						this.Data.UnusedTranslations.forEach(async (unusedTranslation, i) => {
							const row = this.Data.Translations.findIndex(translation => unusedTranslation[0] == translation[0]) + 2;
							this.client.spreadsheets.values.update({
								spreadsheetId: this.spreadsheetId,
								range: `Foglio1!A${row}`,
								valueInputOption: 'USER_ENTERED',
								resource: {
									values: [["no"]]
								}
							})
						})
					} catch (ex) {
						console.log("UpdateUsedKeys failed")
					}
				}
			} else {
				console.log("Cannot set Used Translation Key: " + this.Data.UnusedTranslations)
			}
		}
	}
}

module.exports = TranslationsFile