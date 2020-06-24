### Rambling

**I have a lot of plans for Plug but I don't have a lot of time to work on them, the development of Plug will happen in bursts whenever I get around it.**

As much as I love GNOME, I would have never attempted to write an extension for it, I researched it a while ago, and when I saw what I have to go through, I promised myself to never get anywhere near it.

GNOME Javascript (GJS) is HELL, it was a huge mess to write this extension (and maintain it), I had to dig through dozens of Github repos to find code examples of what I wanted to do because GNOME docs are a cursed maze.

A while ago I found an extension that was called [Argos](https://github.com/p-e-w/argos), it makes developing extensions easier by handling all of the mess away from you, and I used it a lot... until I got greedy and wanted more, so I went to their repo planning to contrib some code for new features, but turns out that [Argos is unmaintained](https://github.com/p-e-w/argos/pull/106#issuecomment-573278743).

Not wanting to give up on my dreams of a more personalized GNOME setup, I decided to go through hell.

Documentation:

- [Installation.](#Installation)
- [Installing Plugins.](#Installing-Plugins)
- [Creating Plugins.](#Creating-Plugins)
- [Configuring Plugins.](#Configuring-Plugins)

### Installation

**Not available through the [GNOME Extensions Website](https://extensions.gnome.org/) (I will publish it when the project is mature enough).**

Here's how to install the extension manually:  
This only supports the latest version of GNOME (That's 3.36).

```
git clone https://github.com/ItsKerolos/plug
```
```bash
cd plug
```
```
npm install && npm run build && npm run link_gnome
```

After that just reload the shell and make sure Plug is enabled in the Extensions app.

---

### Installing Plugins

Plug automatically loads new plugins, don't reload the shell or do anything else.

```bash
cd ~/.config/plug
```
```
git clone https://github.com/[user]/[plug-in-name]
```

##### LIST OF AWESOME PLUGINS TO TRY:

- [Spotify](https://github.com/ItsKerolos/plug-in-spotify): Shows you what's currently playing and offers some playback controls.

---

### Creating Plugins

Install Plug then go to ```~/.config/plug``` and create a directory for your plugin.

Inside the directory create a file called ```plugin.json``` (required).

| property  | required | type                          | description                                                                                                                   | default                                 |
|-----------|----------|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| execute   | required | string                        | the command that should return an output that Plug can parse then render, this can be can be anything e.g. ```sh```, ```node```, etc. | null                                    |
| main      | optional | string                        | this file path will get passed to the execute command. e.g. ```main.sh```.                                                        | null                                    |
| interval  | optional | number (milliseconds)         | the time between each execution.                                                                                              | -1                                      |
| alignment | optional | "left" \| "right" \| "center" | the alignment inside the GNOME panel.                                                                                         | set by GNOME.                           |
| priority  | optional | number                        | the priority inside the GNOME panel.                                                                                          | set by GNOME.                           |

##### Here's a few examples of what plugin.json should look like:

```json
{
  "execute": "sh",
  "main": "main.sh",
  "alignment": "left",
  "priority": 2
}
```

```json
{
  "execute": "xclip -selection clipboard -o",
  "interval": 1000
}
```

***~Any plugin that takes longer than 5 seconds to finish an execution gets killed, and disabled permanently unless the user enables it again manually.***

*~Plug automatically handles (re)loading plugins when their files are created, updated, or deleted.*

*~An interval of -1 means that the plugin only executes once when it's (re)loaded.*

---

If you need more than to just render a plain label in the panel, you need to output some stuff to Plug, you can do that in whatever manner you like, it depends on your choice of ```config.execute```.

###### BASH
```bash
echo "Hello"
```
###### NODE
```js
console.log('Hello');
```
###### PYTHON
```python
print('Hello')
```

---

Now before we list all the widgets available, you need to have an understanding of output formatting, so that Plug can understand it.


The first line of output is always what renders inside the plugin's panel button, this line only has limited number of props available, the following examples showcase all possible props that can be used with it.

##### Here's how to render just a label:
```bash
echo 'Hello'
```

##### Here's is how to render just an icon:
```bash
echo ' | icon(/~config/plug/[plug-in]/icon.svg)'
```

##### Here's both:
```bash
echo 'Hello | icon(system-search-symbolic)'
```

##### Here's both and a press event:
```bash
echo "Hello | icon(https://fakecdn.io/icon.png) | press(pacman -Su)"
```

*As you can gather:*  
*~the first prop is **always the label.***  
*~props must be separated with ```|``` but this can be escaped with a backslash.*

All other lines after the first one are rendered inside the menu that appears when the panel button is pressed.

##### Here's some examples of what you can do in those lines:
```bash
echo "Hello | image(/~config/plug/[plug-in]/white s pace.png)"
```
```bash
echo " | image({ url(/~config/plug/[plug-in]/image.png), width(32), height(48) })"
```
```bash
echo "Hello | vertical | image({ url(system-search-symbolic), width(32) })"
```
```bash
echo "Hello | icon(system-search-symbolic) | press(google-chrome-stable)"
```
```bash
echo "Hello | clipboard(Hello World) | notify(Copied 'Hello World' to clipboard.)"
```
*~Some props like ```image()``` have (optional) parameters like width and height*  
*To use them, surround them with ```{}``` and separate them with ```,``` and this also this can be escaped with a backslash.*  

##### To render a separator between widgets output a line with no label and no props:
```bash
echo " | "
```

---

##### Here's a full list of all available props:

*~All the props have examples on this page but if something is giving you trouble, look at some other plugins code.*

| property | type                   | type examples                                                                                                         | description                                                     | parameters          |
|----------|------------------------|-----------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|---------------------|
| vertical  | boolean               | none                                                                                                                  | positions widget vertically instead of horizontally..           | none                |
| icon      | gicon \| path \| link | name-thing-symbolic </br> </br> /path/name.svg </br> </br> https://website.com/thing.png </br> </br>                  | renders an image in a small square.                             | none                |
| image     | gicon \| path \| link | name-thing-symbolic </br> </br> /path/name.png </br> </br> https://website.net/thing.svg </br> </br>                  | render an image in full (or specified) size.                    | width </br> height  |
| press     | command               | pacman -Su </br> spotify                                                                                              | emits when the widget is pressed, executes a command.           | none                |
| notify    | text                  | Manjaro is better than Ubuntu.                                                                                        | emits when the widget is pressed, sends a notification.         | title </br> message |
| clipboard | text                  | You copied this text because you clicked a button.                                                                    | emits when the widget is pressed, copies text to the clipboard. | none                |

---

### Configuring Plugins

The values in plugin.json are passed to the execution process as environment variables.

##### Something like this:
```json
{
  "greetings": true,
  "execute": "sh",
  "main": "main.sh"
}
```

##### Can be reached like this: (Config keys are prefixed with PL_CONFIG_ then the key in uppercase).*

###### BASH
```bash
  if [[ "$PL_CONFIG_GREETINGS" == true ]]; then
    TITLE="Hello"
  else
    TITLE=""
  fi
```

Of course, you can do the same in any other language that supports environment variables.