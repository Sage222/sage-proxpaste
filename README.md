# sage-proxpaste
Chrome Extension to allow easy Clipboard copy and paste into Proxmox VMs.

Lets you copy text on your computer and type it into a Proxmox VM console — something that normally doesn't work because the VM console is basically a video stream that only accepts keyboard input.
When you click the extension icon, a small box pops up. You paste your text in, hit Enter or click send and the extension pretends to be a keyboard and types it all out into the VM for you, one character at a time.


Instructions:
Download the files.  Add them to zip file.  Goto: chrome://extensions/  tick Developer Mode Switch and add the zip Unpacked folder.

Restart the proxvox tab if its open. It wont work unless its reloaded after the extension is enabled.

Works on Brave Browser too - prob other chrome based ones as well.

Everything local. No privacy concerns.

Enjoy





Technical detail
When you click the extension icon, Chrome fires action.onClicked in the background script, which injects a floating panel directly into the top-level Proxmox page (not the iframe).

The panel is just a simple text area that accepts normal browser paste via keyboard or via (Ctrl+V). 

When you hit Enter or Send, the panel grabs the text and sends it to the background script via chrome.runtime.sendMessage.

The background script then injects the keystroke simulator into all frames on the tab. The simulator skips any frame that doesn't have a <canvas> element, so it naturally targets the noVNC canvas inside the Proxmox iframe.

The simulator loops through each character, fires keydown → keypress → keyup events with the correct key codes (handling uppercase, symbols, shift combinations etc.), with a small configurable delay between each character so the VM console doesn't get overwhelmed.
