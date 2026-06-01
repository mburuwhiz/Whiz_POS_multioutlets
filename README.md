<div align="center">
  <br />
  <a href="https://github.com/your-username/whiz-pos">
    <img src="https://coresg-normal.trae.ai/api/ide/v1/text-to-image?prompt=modern%20minimal%20POS%20system%20logo%20with%20gradient%20blue%20and%20cyan%20colors&image_size=square_hd" alt="WHIZ POS Logo" width="140" height="140" style="border-radius: 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
  </a>

  <h1 align="center">WHIZ POS</h1>

  <p align="center">
    The most powerful, multi-outlet point-of-sale system for modern businesses.
    <br />
    <a href="https://whizpos.com"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/your-username/whiz-pos/issues">Report Bug</a>
    ·
    <a href="https://github.com/your-username/whiz-pos/issues">Request Feature</a>
  </p>
</div>

<br />

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/your-username/whiz-pos?style=for-the-badge&logo=github&colorB=00b894&label=Stars)](https://github.com/your-username/whiz-pos/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/your-username/whiz-pos?style=for-the-badge&logo=github&colorB=74b9ff&label=Forks)](https://github.com/your-username/whiz-pos/network/members)
[![GitHub issues](https://img.shields.io/github/issues/your-username/whiz-pos?style=for-the-badge&logo=github&colorB=fd79a8&label=Issues)](https://github.com/your-username/whiz-pos/issues)
[![GitHub license](https://img.shields.io/github/license/your-username/whiz-pos?style=for-the-badge&logo=github&colorB=fdcb6e&label=License)](https://github.com/your-username/whiz-pos/blob/main/LICENSE)
[![Version](https://img.shields.io/badge/version-8.0.0-00cec9?style=for-the-badge&logo=npm)]()

</div>

---

## 🌐 About The Project

WHIZ POS is a **next-generation, multi-outlet point-of-sale system** built for modern businesses. It combines the power of Electron, React, and cutting-edge sync technology to deliver an unparalleled retail experience.

### 🚀 Key Features

Here's what makes WHIZ POS special:

* **💻 Multi-Outlet Architecture**: One central server, unlimited connected outlets.
* **🔄 Real-Time Sync**: Automatic, bidirectional sync between server and outlets.
* **📡 mDNS Discovery**: Outlets automatically discover the server on the local network.
* **🌐 Offline-First**: Outlets keep working even when disconnected from the server.
* **📦 Inventory Management**: Full-featured stock control with per-outlet assignments.
* **💳 Sales Processing**: Quick, intuitive checkout with customizable receipts.
* **👥 User Roles & Permissions**: Cashiers, managers, and admins — each with tailored access.
* **🔍 Credit Customers**: Track credit sales and customer balances effortlessly.
* 📊 Powerful Reports: Real-time analytics, charts, and exportable reports.
* **🖨️ Receipt Printing**: Built-in support for thermal printers.

<br>

## 🛠️ Built With

This project wouldn't be possible without these amazing tools & technologies:

<div align="center">
  <a href="https://react.dev/" target="_blank">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  </a>
  <a href="https://www.electronjs.org/" target="_blank">
    <img src="https://img.shields.io/badge/Electron-20232A?style=for-the-badge&logo=electron&logoColor=47848F" alt="Electron" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank">
    <img src="https://img.shields.io/badge/TypeScript-20232A?style=for-the-badge&logo=typescript&logoColor=3178C6" alt="TypeScript" />
  </a>
  <a href="https://tailwindcss.com/" target="_blank">
    <img src="https://img.shields.io/badge/Tailwind_CSS-20232A?style=for-the-badge&logo=tailwindcss&logoColor=06B6D4" alt="Tailwind CSS" />
  </a>
  <a href="https://vitejs.dev/" target="_blank">
    <img src="https://img.shields.io/badge/Vite-20232A?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite" />
  </a>
  <a href="https://zustand-demo.pmnd.rs/" target="_blank">
    <img src="https://img.shields.io/badge/Zustand-20232A?style=for-the-badge&logo=npm&logoColor=CB3837" alt="Zustand" />
  </a>
  <a href="https://expressjs.com/" target="_blank">
    <img src="https://img.shields.io/badge/Express.js-20232A?style=for-the-badge&logo=express&logoColor=000000" alt="Express.js" />
  </a>
  <a href="https://lucide.dev/" target="_blank">
    <img src="https://img.shields.io/badge/Lucide_Icons-20232A?style=for-the-badge&logo=feather&logoColor=F5F5F5" alt="Lucide Icons" />
  </a>
</div>

<br>

## 🚀 Getting Started

Follow these simple steps to get a local copy up and running.

### 📋 Prerequisites

Before you begin, ensure you have met the following requirements:

* **Node.js**: `^24.11.0` ([Download Node.js](https://nodejs.org/))
* **npm**: Latest version (usually ships with Node.js)

Verify your installation by running:
```bash
node --version
npm --version
```

### 💾 Installation

1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-username/whiz-pos.git
   cd whiz-pos
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your custom logo (optional but recommended)**:
   Place your `logo.ico` file in the `assets/` directory at the root of the project.

### 🏃 Running the App

#### Development Mode

To run the **server** in dev mode:
```bash
npm run dev:server
```

To run an **outlet** in dev mode:
```bash
npm run dev:outlet
```

If you want to just run the Vite dev server without Electron:
```bash
npm run dev:vite
```

#### Production Build

To build the production-ready executable:
```bash
npm run build
```

The built files will be in the `dist/` directory, and the installers will be generated by Electron Builder.

<br>

## 📖 Usage

Here's a quick guide to using WHIZ POS:

### Server Setup
1. Launch the server app
2. Complete the initial setup wizard
3. Add your products, users, and business details
4. Wait for outlets to connect

### Outlet Setup
1. Launch the outlet app
2. It will automatically discover the server using mDNS
3. Send a connection request to the server
4. The server will approve the outlet and assign products/users
5. Start selling!

---

## 📂 Project Structure

```
whiz-pos/
├── assets/               # Static assets (logo, images, etc.)
├── src/                  # Source code
│   ├── components/       # React components
│   ├── pages/            # Full page components
│   ├── store/            # Zustand state management
│   ├── lib/              # Utility functions
│   ├── sync/             # Sync system types & logic
│   └── main/             # Electron main process code
├── electron.cjs          # Main Electron entry point
├── preload.js            # Preload script for Electron
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies & scripts
```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👥 Authors

* **Whizpoint Solutions** - *Initial work*

See also the list of [contributors](https://github.com/your-username/whiz-pos/contributors) who participated in this project.

---

## 💬 Contact

If you have any questions, feel free to reach out:

- **Email**: support@whizpos.com
- **Website**: [https://whizpos.com](https://whizpos.com)

---

## 🙏 Acknowledgments

We'd like to extend our gratitude to the following:

* [React](https://react.dev/) for the amazing UI library
* [Electron](https://www.electronjs.org/) for making cross-platform desktop apps easy
* [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
* All open-source contributors who help make projects like this possible!

---

<div align="center">
  Made with ❤️ by Whizpoint Solutions
</div>
