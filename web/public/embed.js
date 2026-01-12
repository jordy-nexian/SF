/**
 * Stateless Forms Embed Script
 * Usage: <script src="https://yourapp.com/embed.js" data-form-id="your-public-id"></script>
 *        <div id="stateless-form"></div>
 */
(function () {
	"use strict";

	// Find the script tag to get configuration
	const scripts = document.querySelectorAll('script[data-form-id]');
	const currentScript = scripts[scripts.length - 1];

	if (!currentScript) {
		console.error("Stateless Forms: Missing data-form-id attribute on script tag");
		return;
	}

	const formId = currentScript.getAttribute("data-form-id");
	const containerId = currentScript.getAttribute("data-container") || "stateless-form";
	const baseUrl = currentScript.src.replace(/\/embed\.js.*$/, "");

	if (!formId) {
		console.error("Stateless Forms: data-form-id is required");
		return;
	}

	// Wait for DOM to be ready
	function init() {
		const container = document.getElementById(containerId);
		if (!container) {
			console.error(`Stateless Forms: Container #${containerId} not found`);
			return;
		}

		// Create iframe
		const iframe = document.createElement("iframe");
		iframe.src = `${baseUrl}/f/${formId}?embed=true`;
		iframe.style.cssText = "width:100%;border:none;min-height:400px;";
		iframe.setAttribute("title", "Form");
		iframe.setAttribute("loading", "lazy");

		// Handle iframe resize messages
		window.addEventListener("message", function (event) {
			if (event.origin !== baseUrl) return;
			try {
				const data = JSON.parse(event.data);
				if (data.type === "stateless-form-resize" && data.formId === formId) {
					iframe.style.height = data.height + "px";
				}
				if (data.type === "stateless-form-submitted" && data.formId === formId) {
					// Dispatch custom event for parent page
					container.dispatchEvent(
						new CustomEvent("formSubmitted", {
							detail: { formId, submissionId: data.submissionId },
						})
					);
				}
			} catch (e) {
				// Ignore non-JSON messages
			}
		});

		container.innerHTML = "";
		container.appendChild(iframe);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();












