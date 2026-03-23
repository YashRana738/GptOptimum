# 🚀 GPT Optimum

A lightweight userscript that improves ChatGPT performance in long conversations by virtualizing off-screen messages.

> No more lag, freezing, or slow scrolling on large chats.

---

## ✨ Features

- ⚡ **Message Virtualization**  
  Unloads off-screen messages to reduce DOM load

- 🚀 **Smoother Performance**  
  Faster scrolling and better responsiveness

- 🧠 **Lower Memory Usage**  
  Reduces CPU and RAM usage on long chats

- 🎛️ **Built-in Controls**
  - Enable / Disable anytime  
  - Aggressive mode (more performance)  
  - Debug mode (visualize unloaded elements)  
  - Instant new chat detection  

- 🧩 **Plug & Play**  
  Works automatically on ChatGPT

---

## 📦 Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/)
   - Violentmonkey

2. Install the script from GreasyFork (or add manually)

3. Open ChatGPT → it works automatically 🎉

---

## 🧠 How It Works

ChatGPT slows down because it renders **all messages in the DOM**, even the ones you can’t see.

GPT Optimum uses **IntersectionObserver + content-visibility** to:
- Detect off-screen messages  
- Unload them safely  
- Restore them instantly when needed  

This keeps the UI fast even with very long conversations.

---

## ⚙️ Settings

A floating control panel lets you:

- Toggle optimization on/off  
- Enable aggressive unloading  
- Turn on debug mode  
- Control behavior for new chats  

---

## 📸 Preview

*(Add screenshots here if you want)*

---

## 🛠️ Tech

- Vanilla JavaScript  
- IntersectionObserver API  
- content-visibility CSS  
- Greasemonkey/Tampermonkey APIs  

---

## ⚠️ Notes

- Designed specifically for ChatGPT UI  
- May need updates if ChatGPT changes its DOM structure  

---

## 🙌 Author

**Yash Rana**

---

## ⭐ Support

If this helped you, consider starring the repo!
