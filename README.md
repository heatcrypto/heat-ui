# Heat Ledger Client Framework
In this `README` you will find step by step instructions to get up and running developing **heat-ui** applications.
Heat-ui framework is a complete end to end development setup. 

In heat-ui you find:

- **Visual Studio Code** configuration and setup
- **TypeScript** configuration for Visual Studio Code
- Full **code completion** for all Angular, Angular Material and all our own code
- **Gulp development and build** setup
- **Gulp TypeScript** configurations
- Local **development server** TypeScript bindings
- TypeScript client side services
  1. **cryptography**
  2. networking, **real-time push pull and pubsub**
  3. byte/binary support (**object mappers**)
  4. **user/key** management
  5. **settings** framework (with ui bindings)
  6. create, inspect or veryfy **HEAT Ledger transactions**
- UI components
  1. **real-time update** on web socket events
  2. **advanced dialog support** (standard, input, multi page wizard)
  3. **auto complete** support (see server results as you type)
- Angular Material and the **Google Material Design** rules
- Coded in **Angular 2 style** :sunglasses:
- **Bootstrapper** that injects Angular 2 compatible `Component`, `Service`, `Inject` (and others) TypeScript decorators.
- High **compatibility with Angular 2** through our very own **Angular 1 to Angular 2 bridge**

## Note

At Heat Ledger Ltd we currently do our client and server development on Debian/Ubuntu desktops, we find it to be an excellent open source free! and secure platform. While we try and help new developers coming to heat-ui as best as possible, it is unfortunately not possible to include detailed step by step instructions for platforms that are not Debian based. Looking at you here Windows and Mac.

In time it is our goal to include detailed step by step instructions for all platforms. So if you are using heat-ui and you are on Windows or Mac? Please be so kind to record the steps that it involved and provide those to us so we can share them with any other new user/developer that comes after you.

That said, we will be including links to documents describing the various steps for all supported platforms.

## Installation

To get started developing heat-ui applications you really need your own copy of heat-ui. Easiest is to simply git clone the repo. This way you have everything in place to share back changes you made to heat-ui and to easily download upstream changes to heat-ui to your local development copy.

To clone heat-ui to your own machine open a terminal and `cd` to where you want your heat-ui folder to appear. Now type the following to clone heat-ui.

`git clone https://github.com/Heat-Ledger-Ltd/heat-ui.git`

### Visual Studio Code

Visual Studio Code is a Microsoft Open Source project that provides you with a cross platform (Windows, Linux, Mac) free advanced development suite. It offers a file explorer, debugging support, git integration and excellent support for the Open Source Microsoft TypeScript language.

![VS Code screenshot](http://i.imgur.com/43Yp5zV.png "VS Code screenshot")

One of the main reasons why creating applications with heat-ui goes so fast is because of the powerfull tooling provided by Visual Studio Code and it's of TypeScript. Unlike any other Javascript application you've made before, through VS Code we get the same productivity boost one finds when using an IDE for Java, C++, C# or any other strongly typed language.

Please go ahead to https://code.visualstudio.com and install the latest version for your platform. 

### Node-JS

Heat-ui makes extensive use of nodejs. We use if for dependency managemnt, to power our builds and to assist in development through auto-recompiling and to power up your local development server.

Complete installation instructions for nodejs are out of the scope of this document since those instructions depend largely on the platform you are on.

Windows and Mac users please look at anyone of these links:

- https://www.google.com/search?q=how+to+install+nodejs (GIYF)
- https://howtonode.org/how-to-install-nodejs

Debian/Ubuntu users please follow these steps

```
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
```

### Gulp




