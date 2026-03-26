# JSON Grid Viewer

A powerful, client-side, single-file HTML tool for visualizing, editing, and analyzing complex JSON data in a clear, tabular grid format. No server or setup is required—just open the file in your browser.

This tool is designed to help developers and data analysts make sense of nested JSON structures by rendering them into interactive tables, making data exploration intuitive and efficient.

## ✨ Features

- **Live JSON Editor:** A content-editable area with automatic syntax highlighting for your JSON input.
- **JSON Formatting:** A "Format JSON" button to prettify your raw JSON with proper indentation.
- **Dynamic Grid Generation:** Automatically converts nested JSON objects and arrays into interactive, easy-to-read HTML tables.
- **Interactive Data Exploration:**
  - **Hide Columns:** Click on any table header to hide the corresponding field across the dataset.
  - **Hide Rows:** Click on a row's index number (`#`) to hide that specific entry.
  - **Restore Hidden Items:** A "Hidden" bar appears with chips for each hidden field or row. Click a chip to restore it, or use "Unhide All" to clear all filters.
- **Responsive & Customizable Layout:**
  - **Resizable Panels:** Drag the central divider to adjust the size of the input and output panels.
  - **Independent Zoom:** Use dedicated `+` / `-` buttons or `Ctrl + Mouse Wheel` to zoom the text size of the JSON input and the grid view independently.
- **Dual-Theme UI:** Toggle between a clean Light mode and a VSCode-inspired Dark mode.
- **Enhanced Editor Experience:**
  - **Undo/Redo:** Standard `Ctrl + Z` and `Ctrl + Shift + Z` support for text edits in the JSON input area.
  - **Error Handling:** Displays clear error messages for invalid JSON syntax upon formatting or grid generation.
- **Zero Dependencies:** A completely self-contained `index.html` file. It runs entirely in your browser without needing an internet connection, servers, or build steps.

## 🚀 How to Use

1. Download or clone this repository.
2. Open the `index.html` file in any modern web browser (e.g., Chrome, Firefox, Edge, Safari).
3. Paste your raw JSON data into the **Input JSON** panel on the left.
4. (Optional) Click **Format JSON** to validate and indent your code.
5. Click **Generate Grid** to visualize the data in the **Grid View** panel on the right.
6. Interact with the grid by clicking column headers or row indexes to filter out noise and focus on what matters.

## 🛠️ Technical Details

- **Frontend:** Built with plain HTML, CSS, and Vanilla JavaScript (ES6).
- **Styling:** Utilizes CSS variables for easy theming and maintenance. Features CSS `:has()` pseudo-classes for advanced table row/column hover effects.
- **Architecture:** The project is intentionally kept as a single, portable file without external libraries (like React, Vue, or Tailwind) to ensure maximum compatibility and ease of use as a standalone utility.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is open-source and available under the MIT License.
