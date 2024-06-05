import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

interface NoteToClipboardSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: NoteToClipboardSettings = {
	mySetting: "default",
};

type ListItem = {
	content: string;
	type: "ul" | "ol";
	children?: List; // Nested list
	level: number;
};

type List = {
	type: "ul" | "ol";
	items: Array<ListItem | List>;
	level: number;
};

import { html as beautify } from "js-beautify";

export default class NoteToClipboard extends Plugin {
	settings: NoteToClipboardSettings;

	async onload() {
		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.

		this.addCommand({
			id: "copy-meeting-note-to-clipboard",
			name: "N2C: Copy meeting note to clipboard",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.copyNoteToClipboard(editor);
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async copyNoteToClipboard(editor: Editor) {
		const noteContent = editor.getValue(); // Get current note content
		const preprocessedContent = this.preprocessContent(noteContent); // Apply custom preprocessing
		const htmlContent = this.convertMarkdownToHtml(preprocessedContent); // Convert to HTML
		this.copyToClipboard(htmlContent); // Copy to clipboard
	}

	formatDateFromString(input: string): string {
		// Regular expression to extract the date part
		const regex = /\[\[(\d{4})-(\d{2})-(\d{2})/;
		const match = input.match(regex);

		if (!match) {
			throw new Error("Invalid input format");
		}

		// Extracting year, month, and day from the regex match
		const year = match[1];
		const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JavaScript Date
		const day = match[3];

		// Creating a Date object
		const date = new Date(parseInt(year), month, parseInt(day));

		// Formatting the date as "DD. month YYYY"
		const options: Intl.DateTimeFormatOptions = {
			year: "numeric",
			month: "long",
			day: "numeric",
		};

		// Extracting the formatted date string in the desired locale
		// Replace 'is-IS' with the appropriate locale for Icelandic
		const formattedDate = date.toLocaleDateString("is-IS", options);

		// Converting the formatted date to the desired output format
		// Note: The output from toLocaleDateString might need slight adjustments
		// depending on locale specifics, here's a general approach
		const [dayPart, monthPart, yearPart] = formattedDate.split(" ");
		const MonthMap = {
			January: "janúar",
			February: "febrúar",
			March: "mars",
			April: "apríl",
			May: "maí",
			June: "júní",
			July: "júlí",
			August: "ágúst",
			September: "september",
			October: "október",
			November: "nóvember",
			December: "desember",
		};
		let realMonthPart = MonthMap[monthPart as keyof typeof MonthMap];
		return `${parseInt(dayPart)}. ${realMonthPart} ${yearPart}`;
	}

	preprocessContent(content: string): string {
		// Example preprocessing: remove certain lines, replace text, etc.
		// Remove lines starting with "tags:"
		// Remove lines starting with "Dags:"
		// Remove lines starting with "dags:"
		// Remove lines starting with "gerð:"
		// Remove lines starting with "stofnun:"
		// Remove lines starting with "samantekt:"
		// Remove lines starting with "staðsetning:"
		// console.log(content);
		// let processedContent = content.replace(
		// 	/^([tdD]ags|gerð|stofnun|samantekt|staðsetning):.*/gm,
		// 	""
		// );

		// metadata
		// Remove the first instances of three dashes in a row (---) and everything between them
		let processedContent = content.replace(/^---.*?---/s, "");
		// remove other tags
		processedContent = processedContent.replace(
			/^([tdD]ags|gerð|stofnun|samantekt|staðsetning|up:):.*/gm,
			""
		);

		// Replace the whole title line with a formatted date from "YYYY-MM-DD" to "DD. month YYYY"
		processedContent = processedContent.replace(
			/^# .*/gm,
			("## " + this.formatDateFromString(content)) as unknown as string
		);

		processedContent = processedContent.replace(
			/^## Punktar fyrir fundinn/gm,
			"**Punktar fyrir fundinn**"
		);
		processedContent = processedContent.replace(
			/^## Umræður/gm,
			"**Umræður**"
		);
		processedContent = processedContent.replace(
			/^## Take [aA]way/gm,
			"**Take Away**"
		);
		// remove residual bracket links
		// processedContent = processedContent.replace(/(\[\[|\]\])/g, "**");
		console.log(processedContent);
		return processedContent;
	}
	buildHtmlStyles(html) {
		let style = `
		<style type="text/css">
			body {
				font-family: Arial;
				color: #000;
			}
			p {
				font-size: 11px;
				margin: 0;
				padding: 0;
			}
			h2 {
				font-size: 16px;
				font-weight: normal;
			}
			em {
				font-style: italic;
			}
			strong {
				font-weight: bold;
			}
			ul {
				list-style-type: "-";
				margin-left: 10px;
			}

		</style>
		`;
		// declare the type for the TagMap
		// replace starting html tags with the corresponding tag and style
		const TagMap: { [key: string]: string } = {
			body: `<body style="font-family: Arial;color: #000;">`,
			p: `<p style="font-size: 11px;margin: 0;padding: 0;">`,
			h2: `<h2 style="font-size: 16px;font-weight: normal;">`,
			h3: `<h3 style="font-size: 14px;font-weight: normal;">`,
			h4: `<h4 style="font-size: 12px;font-weight: normal;color #rgb(102, 102, 102);">`,
			em: `<em style="font-style: italic;">`,
			strong: `<strong style="font-weight: bold;">`,
			ul: `<ul style="list-style-type: '-';margin-left: 10px;">`,
			li: `<li style="font-size: 11px;margin: 0;padding: 0;">`,
		};
		for (const tag in TagMap) {
			html = html.replace(
				new RegExp(`<${tag}>`, "gm"),
				TagMap[tag] as string
			);
		}
		return html;
	}
	convertMarkdownListToHtml(lines: string[]): string {
		let html = "";
		let currentIndentLevel = 0;
		let openTags = [];

		lines.forEach((line) => {
			const indentLevel = line.search(/\S|$/); // Find first non-whitespace character
			const content = line.trim();
			const isOrdered = /^\d+\./.test(content);
			const isUnordered = /^-/.test(content);
			if (openTags.length === 0) {
				const openingTag = isOrdered ? "<ol>" : "<ul>";
				html += `${openingTag}\n`;
				openTags.push(openingTag);
			}

			// Adjust for deeper or shallower nesting
			while (currentIndentLevel < indentLevel) {
				currentIndentLevel += 1;
				const tag = isOrdered ? "<ol>" : "<ul>";
				html += `${" ".repeat(currentIndentLevel - 1)}${tag}\n`;
				openTags.push(tag);
			}
			while (currentIndentLevel > indentLevel && openTags.length > 0) {
				const tag = openTags.pop();
				currentIndentLevel -= 1;
				html += `${" ".repeat(currentIndentLevel)}${tag.replace(
					"<",
					"</"
				)}\n`;
			}

			// Adjust if changing list type at the same indentation
			if (openTags.length > 0) {
				const lastTag = openTags[openTags.length - 1];
				const newTag = isOrdered ? "<ol>" : "<ul>";
				if (lastTag !== newTag) {
					html += `${" ".repeat(
						currentIndentLevel - 1
					)}${lastTag.replace("<", "</")}\n`;
					html += `${" ".repeat(currentIndentLevel - 1)}${newTag}\n`;
					openTags.pop();
					openTags.push(newTag);
				}
			}

			// Add the list item
			if (isOrdered || isUnordered) {
				const listItemContent = content.replace(/^- |\d+\. /, ""); // Remove markdown list syntax
				html += `${" ".repeat(
					indentLevel
				)}<li>${listItemContent}</li>\n`;
			}
		});

		// Close any remaining tags
		while (openTags.length > 0) {
			const tag = openTags.pop();
			html += `${tag.replace("<", "</")}\n`;
		}
		const applyOtherFormatting = (html: string) => {
			html = html
				.split("\n")
				.map((line) => this.otherParagraphFormatting(line))
				.join("\n");
			return html;
		};
		html = applyOtherFormatting(html);
		return html.trim();
	}
	otherParagraphFormatting(line: string): string {
		// Handle other markdown features here as needed (headings, etc.)
		if (line.startsWith("## ")) {
			line = `<h2>${line.substring(3)}</h2>\n`;
		} else if (line.startsWith("### ")) {
			line = `<h3>${line.substring(4)}</h3>\n`;
		} else if (line.startsWith("#### ")) {
			line = `<h4>${line.substring(5)}</h4>\n`;
		} else if (line.startsWith("# ")) {
			line = `<h1>${line.substring(2)}</h1>\n`;
		} else if (line.trim() !== "") {
			// change ** to <strong> and * to <em>
			// do the same to __ and _
			line = line
				.replace(/^\*\*(.*?)\*\*:/g, "<p><strong>$1:</strong></p>")
				.replace(/^\*\*(.*?)\*\*/g, "<p><strong>$1:</strong></p>")
				.replace(/^\*(.*?)\*/g, "<p><em>$1</em></p>")
				.replace(/^__(.*?)__/g, "<p><strong>$1</strong></p>")
				.replace(/^_(.*?)_/g, "<p><em>$1</em></p>")
				.replace(/(\[\[)/g, "<span><strong>")
				.replace(/(\]\])/g, "</strong></span>")
				.replace(/\*\*(.*?)\*\*/g, "<span><strong>$1</strong></span>")
				.replace(/\*(.*?)\*/g, "<span><em>$1</em></span>");
		}
		return line;
	}
	/**
	 * Checks if a given line is a list line by using regex
	 *
	 * @param line The line to check.
	 * @returns True if the line is a list line, false otherwise.
	 */
	isListLine(line: string): boolean {
		return /^(\t*)(\+|-|\d+\. )/gm.test(line);
	}
	convertMarkdownToHtml(markdown: string): string {
		// Parse the markdown to get a structured representation of lists
		let html = "<div>\n<body>\n";
		const lines = markdown.split("\n");

		let listsLines: string[] = [];
		for (let line of lines) {
			// Check if the line is part of a list via markdown syntax
			if (this.isListLine(line)) {
				// Push the line to the array of list lines
				listsLines.push(line);
			} else {
				// process the gathered list lines in bulk
				if (listsLines.length > 0) {
					const formattedListHtml =
						// this.generateListHtmlFromStructure(
						// 	this.parseMarkdownToListStructure(
						// 		listsLines.join("\n")
						// 	)
						// );
						this.convertMarkdownListToHtml(listsLines);
					html += formattedListHtml;
					listsLines = [];
				}

				// Process non-list lines as before
				line = this.otherParagraphFormatting(line);
				html += `<p>${line}</p>\n`;
			}
		}
		if (listsLines.length > 0) {
			const formattedListHtml =
				this.convertMarkdownListToHtml(listsLines);
			html += formattedListHtml;
		}

		// Close any open HTML tags here
		html += "</body>\n</div>\n";

		console.log(
			beautify(html, { indent_size: 2, space_in_empty_paren: true })
		);
		return html;
	}
	copyToClipboard(htmlContent: string) {
		// Create an editable div to insert the HTML content
		const div = document.createElement("div");
		div.contentEditable = "true";
		document.body.appendChild(div);
		div.innerHTML = htmlContent;
		// Select the content
		const range = document.createRange();
		const sel = window.getSelection();
		range.selectNodeContents(div);
		sel.removeAllRanges();
		sel.addRange(range);
		// Execute copy command
		navigator.clipboard
			.write([
				new ClipboardItem({
					"text/html": new Blob([htmlContent], { type: "text/html" }),
				}),
			])
			.then(() => {
				new Notice("Meeting note copied to clipboard!");
			})
			.catch((err) => {
				console.error("Failed to copy:", err);
				new Notice("Error copying meeting note to clipboard.");
			});

		// Clean up
		document.body.removeChild(div);
		sel.removeAllRanges(); // Deselect everything
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: NoteToClipboard;

	constructor(app: App, plugin: NoteToClipboard) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
