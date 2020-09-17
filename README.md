# Twitch RGB for LED Strips

This repository is designed as both an example and a tutorial for setting up a RGB LED Strip that connects to Twitch Using [Node.js](https://nodejs.org/en/), [TMI.js](https://github.com/tmijs/tmi.js) and [Johnny Five](http://johnny-five.io/).
It will go through the steps for installing everything you need from scratch from getting Node.JS installed through to how to connect to Twitch and create custom animations.

## Things to Note
This system works slightly differently to standard Arduino projects. Rather than the code running on the Arduino directly the bulk of it runs on a PC that is connected to the Arduino via USB. This allows for much more processing power, storage, connectivity and ease of development. Some downsides mean the Arduino and computer need to be plugged in while the lights are active so it isn't very mobile. However for a streaming environment this shouldn't be too bad as the streaming computer makes for a good platform and they can be connected by a long cable if necessary. This also allows for faster program switching. Because the code is running on the computer, you only ever need to upload a sketch to the Arduino once (More on that later). This means you can use the same Arduino and setup for multiple different projects.

## Getting Started
First things first. Some tools you will need / are recommended to have.

**Required**
- Arduino IDE
- An Arduino compatible board
- An RGB LED Strip
- A computer that will run the code during the stream. (Usually best to run on the streaming computer but can work on the main PC)

**Recommended**
- A code editor that supports JavaScript (most of them). Some good free ones are [Visual Studio Code](https://code.visualstudio.com/) and [Atom](https://atom.io/). Others can work as well but these ones are popular and have great support. You can use a regular text editor if you want but it will make editing code much more difficult.

## Setting Up the Environment
This section will walk through installing Node.JS through NVM as well as setting up a project and installing the required libraries.

To start we will install nvm. This is a tool that allows us to install multiple versions of Node.JS and makes installing specific versions easier. If you already have either Node.JS or nvm you can skip this part.

### Installing NVM

#### Linux / Mac
If you are on Linux or Mac you can use either of the following commands. It will install NVM under the user's home directory.
```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

```sh
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

If you want to customize the install directory then I recommend reading through the NVM installation instructions [here](https://github.com/nvm-sh/nvm#installing-and-updating). That provides both customization and troubleshooting steps.

#### Windows
For windows there is a dedicated installer you can find [here](https://github.com/coreybutler/nvm-windows/releases). Make sure to download the latest release and select the appropriate download. Usually this is labeled `nvm-setup.zip` or similar. Download, unzip and run the installer.


#### Verifying the Installation.
After the installation of NVM is complete make sure to restart any terminals / command prompts to make sure any changes have taken affect.
You can double check your installation by running:
```sh
nvm --version
```
If you don't get an error then your installation was successful. If for some reason you do follow the relevant troubleshooting steps for your platform (located on their download pages under their README)

### Installing Node.JS
Now that NVM is installed we can install Node. To do so just run
```sh
nvm install latest
```
in a terminal/command prompt. This will install the latest version of Node onto your system. Once that has finished you can run
```sh
nvm use <the version you downloaded>
```
Use the version you downloaded. You can find this in the output of the nvm install command. It will look something like 14.9.0 e.g. `nvm use 14.9.0`
After that you can verfiy the installetion by running
```sh
node --version
```
and
```sh
npm --version
```

If you get a version number as output then the installation has worked. If something doesn't work restart your terminal / command prompt and try again. If that still doesn't work follow the troubleshooting steps on the relevant nvm pages for your operating system. (Found above).

## Setting Up the Project
To get started we will need a project space to write our code in and install our libraries to. To do this find a folder that you want to create a project in. Create a new folder and name it `twitch-rgb-lights`. This will be our project folder and all of our code will go in this folder. Open this folder and open a terminal / command prompt here or change your directory in an existing one with
`cd /path/to/project/folder`.

Once this is done run
```sh
npm init -y
```
This will initialize the folder as a Node project and use the default options. If you want to customize then you can run it without the `-y`. It will ask you questions about your project.

The project is now set up and ready to install libraries.

## Installing Libraries
This project will require a few libraries.
- [TMI.js](https://github.com/tmijs/tmi.js). This is what allows us to connect to Twitch.
- [Johnny Five](http://johnny-five.io/). This allows us to control the Arduino.
- [Node Pixel](https://github.com/ajfisher/node-pixel). This is what allows us to control the LED strips.

To install these libraries just run
```sh
npm install tmi.js johnny-five node-pixel
```
This will install the needed libraries for our project. It may take a while (around 5-mins).

Once that is complete there is one final step. Setting up the Arduino.
We will use a tool to get the required version of Firmata for the LED strips. Run the following command:
```sh
npm install -g nodebots-interchange
```
This will add a command to the terminal / command prompt to allow us to flash custom firmware to the Arduino.

To install the firmware run
```sh
interchange install git+https://github.com/ajfisher/node-pixel -a uno --firmata
```
That should install the necessary firmware on the Arduino. If you get any issues try restarting the terminal / command prompt and retry. If that still doesn't work try specifying a port with `-p <your board's port>`. You can get the port of the board you are using from the Arduino IDE under Tools > Port and find the one with your board listed next to it. For example if you board is connected to port COM3 then you can run
```sh
interchange install git+https://github.com/ajfisher/node-pixel -a uno -p COM3 --firmata
```
If you are still having issues refer to the node-pixel repository for troubleshooting steps.

## Writing the Code
To start writing code I recommend using a proper editor as mentioned at the beginning. Open your preferred editor and open our project folder.
In this folder create a new file named `index.js` and open it.
In that file write the following.
```js
const five = require('johnny-five');
const pixel = require('node-pixel');
const tmi = require('tmi.js');
```

This will bring in the needed libraries and give us access to their functions.

### Connecting to the Arduino

Under that add this
```js
let board = new five.Board({port: "<put your board's port here>"});

board.on('ready', ()=>{
  // Our code will go here.
  console.log("Board ready.")
})
```
Replace the port with your boards port from the Arduino IDE.

This lets us wait for the board to be ready to talk before we try to send commands. Most of our code will go inside here.

We can now run our first test.

In the terminal / command prompt run
```sh
node index.js
```

You should see some output similar to this after a couple of seconds.
```
1599398601356 Connected COM3
1599398605222 Repl Initialized
>> Board ready.
```

If you don't see this output or get an error double check the syntax and spelling. Try to look at the error message. Make sure the board is plugged in and that you have the correct port.

Press `Control + C` on Windows and linux or `Command + C` on Mac to end the test. Press it again to close the program.

### Controlling the LED Strip

Go back to the editor and just after our require commands add these few lines:
```js
const tmi = require('tmi.js')
//Add these lines

const STRIP_LENGTH = 100; // Change this to the number of pixels in your strip. This has a maximum of 192 pixels.
const STRIP_PIN = 6; // Change this to the pin you have connected to the data pin on your strip.
//....
```

and inside the board's `ready` listener add this
```js
board.on('ready', ()=>{
  console.log("Board ready.")

  let strip = new pixel.Strip({
    board,
    controller: 'FIRMATA',
    strips: [{ pin: STRIP_PIN}],
    gamma: 2.8,
    length: STRIP_LENGTH
  })

  strip.on('ready', ()=>{
    console.log("Strip ready.");
  })
})
```

This will wait for the LED strip to be ready before we try to change any colours. Any animations and such will have to happen in here.

In the terminal run `node index.js` again and wait for output. You should see something like this:
```
1599400892536 Connected COM3
1599400896401 Repl Initialized
>> Board ready.
Strip ready.
```

If you have any issues make sure the pins and lengths you have set are correct and that the connections between your Arduino and LED Strip are ok. Follow any error messages you receive and again follow any troubleshooting steps provided on the node-pixel library.

Our next step is to get a simple blinking led.

After we create the strip add this line
```js
let strip = new pixel.Strip({
  board,
  controller: 'FIRMATA',
  strips: [{ pin: STRIP_PIN, length: STRIP_LENGTH}],
  gamma: 2.8
})

let isOn = false;
```

and inside the strip's ready listener add this:
```js
strip.on('ready', ()=>{
  console.log("Strip ready.");
  setInterval(()=>{
    if (isOn) {
      strip.off();
      isOn = false;
    } else {
      strip.color([0,0,255]);
      isOn = true;
    }
  }, 1000);//Set this to how many milliseconds you want between each change.
})
```

This will make the strip flash blue every second. You can change the `1000` to specify the number of milliseconds between each change.

When you run the code you should get the strip to flash.

As always if you receive any errors follow any instructions they give and double check syntax.

Stop that test and we can move on.

### Connecting to Twitch
Inside the strip's `ready` listener replace our blink example with this code.

```js
strip.on('ready', ()=>{
  console.log("Strip ready.");
  let client = new tmi.client({
    channels: ['jackpattillo']//add your twitch channel name here. You can get this from your twitch URL
  })

  client.on('message', (channel, userstate, message)=>{
    //Channel is the name of the channel the message came from. userstate includes some extra info like emotes, sub status and the user who sent the message and message is the text of the message.
    strip.color([0,0,255])
    setTimeout(()=>strip.off(), 300)
  })

  client.connect();
})
```

This will make the strip flash blue when a chat message is sent.

The way this works is fairly simple.

The first step is to configure what channels we want to listen to for events. That is done with the `new tmi.client()` lines. The list under channels are the channel names of the channels you want to listen to.

After that is set up we specify what events we want to listen for. This is done with the `client.on("eventname", ()=>{})` part. The event name is one of the available events you can listen to. These include:
- `message` When a chat message / action or whisper is received.
- `cheer` When a cheer is made.
- `hosted` When another user hosts the channel
- `raided` When the channel gets raided
- `resub` When someone resubs.
- `submysterygift` When someone gifts subs to people
- `subscription` When someone subscribes to the channel

The full list can be found [here](https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#subgift).

So to listen for subscriptions you would write
```js
client.on('subscription', (channel, username, methods, message, userstate)=>{
  //Your code to flash lights etc. would go here.
})
```

The list of parameters (channel, username, methods, message, etc.) can be got from [this page](https://github.com/tmijs/docs/blob/gh-pages/_posts/v1.4.2/2019-03-03-Events.md#subgift) in the TMI.js docs.

Below is an example of how to react to the most common events as well as how to get various information about the event from the parameters. e.g. the month streak for a subscription or the number of bits cheered.

```js
strip.on('ready', ()=>{
  console.log("Strip ready.");
  let client = new tmi.client({
    channels: ['jackpattillo']
  })

  client.on('cheer', (channel, userstate, message)=>{
    let numBits = userstate.bits; // numBits will now be the amount of bits cheered.
    strip.color([0,0,255])
    setTimeout(()=>strip.off(), 300)
  })

  client.on('hosted', (channel, username, viewers, autoHost) =>{
    //Viewers will be the number of people who have come across
    strip.color([0,255,0])
    setTimeout(()=>strip.off(), 300)
  })

  client.on('raided', (channel, username, viewers) => {
    //Viewers will be the number of people who have come across
    strip.color([255,0,0])
    setTimeout(()=>strip.off(), 300)
  })

  client.on('resub', (channel, username, streakMonths, message, userstate, methods)=>{
    //streakMonths is the streak the user is on. It will be 0 if the user doesn't want to share their streak.
    let totalMonths = userstate['msg-param-cumulative-months'];
    //totalMonths is the total number of months this user has been subscribed.
    strip.color([255,255,0])
    setTimeout(()=>strip.off(), 300)
  })

  client.on('submysterygift', (channel, username, numOfSubs, methods, userstate) => {
    //numOfSubs is how many usename is gifting.
    let totalPastSubs = userstate['msg-param-sender-count']
    //totalPastSubs is how many the sender has gifted to the channel in total.
    strip.color([255,0,255])
    setTimeout(()=>strip.off(), 300)
  })

  client.on('subscription', (channel, username, methods, message, userstate) => {
    //Username is the subscriber.
    //Message is the message the user attached to their sub.
    strip.color([0,255,255])
    setTimeout(()=>strip.off(), 300)
  })

  client.connect();
})
```

This does some basic flashes of a single color. For fading between colors and animations I have another guide that can explain the process of color animations. You can find that [here](./colors.md)

## Closing Notes
This repository contains code similar to that of the tutorial. It differs slightly as I have added a few extra animation types and also changed some of the imports to allow the use of this library in the browser to experiment with animations.

I might make a tool in the future for editing animations, but for now it will just have to be done in code.

If you wish to experiment with these tools I recommend following the rest of the tutorial so you know how the animations are set up and what extra features are provided. The instructions for accessing these tools is on the last page of the tutorial.
