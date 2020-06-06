**This project is still a WIP**

### Rambling

As much as I love GNOME, I would have never attempted to write an extension for it, I researched it a while ago, and when I saw what I have to go through, I promised myself to never get anywhere near it.

GNOME Javascript (GJS) is HELL, it was a huge mess to write this extension (and maintain it), I had to dig through dozens of Github repos to find code examples of what I wanted to do because GNOME docs are a cursed maze.

But... a while ago I found an extension that was called [Argos](https://github.com/p-e-w/argos), it makes developing extensions easier by handling all of the mess away from your brain, and I used it a LOT... until I got greedy and wanted more, so I went to their repo planning to contrib some code for new features, but turns out that [Argos is unmaintained](https://github.com/p-e-w/argos/pull/106#issuecomment-573278743).

Not wanting to give up on my dreams of a more personalized GNOME setup, I decided to go through hell.

Plug is like Argos... except not really, this will never be backward compatible with it.

### Examples

TODO


### Installation

**Not available through the [GNOME Extensions Website](https://extensions.gnome.org/) (yet anyway).**

Here's how to install the extension manually:

```
git clone https://github.com/ItsKerolos/plug
```
```
cd plug
```
```
npm install && npm run build && npm run link_gnome
```

After that just reload the shell and make sure Plug is enabled in the Extensions app.

### Installing Plugins

Plug automatically loads new plugins, don't reload the shell or do anything else.

```
cd ~/.config/plug
```
```
git clone https://github.com/[user]/[plug-in-name]
```

### Creating Plugins

Install Plug then go to ```~/.config/plug``` and create a directory for your plugin.

Inside the directory create a file called ```plugin.json``` (required).

| property  | required | type                          | description                                                                                                                   | default                                 |
|-----------|----------|-------------------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| name      | optional | string                        | the name of the plugin.                                                                                                       | the basename of the plugin's directory. |
| execute   | required | string                        | the command that should return an output that Plug can parse then render, this can be can be anything e.g. ```sh```, ```node```, etc. | null                                    |
| main      | optional | string                        | this file path will get passed to the execute command. e.g. ```main.sh```.                                                        | null                                    |
| interval  | optional | number (milliseconds)         | the time between each execution.                                                                                              | -1                                      |
| alignment | optional | "left" \| "right" \| "center" | the alignment inside the GNOME panel.                                                                                         | set by GNOME.                           |
| priority  | optional | number                        | the priority inside the GNOME panel.                                                                                          | set by GNOME.                           |

#### Here's a few examples of what plugin.json should look like:

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

TODO

<!-- *~Any plugin that takes longer than 5 seconds to finish an execution gets killed, and disabled permanently unless enabled again manually by the user.*

*~Plug automatically handles (re)loading plugins when their files are created, updated, or deleted.*

*~An interval of -1 means that the plugin only executes once when it's (re)loaded.* -->
