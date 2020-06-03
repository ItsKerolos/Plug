**This project is still a WIP**

### Rambling

As much as I love GNOME, I would have never attempted to write an extension for it, I researched it a while ago, and when I saw what I have to go through, I promised myself to never get anywhere near it.

GNOME Javascript (GJS) is HELL, it was a huge mess to write this extension (and maintain it), I had to dig through dozens of Github repos to find code examples of what I wanted to do because GNOME docs are a cursed maze.

But... a while ago I found an extension that was called [Argos](https://github.com/p-e-w/argos), it makes developing extensions easier by handling all of the mess away from your brain, and I used it a LOT... until I got greedy and wanted more, so I went to their repo planning to contrib some code for new features, but turns out that [Argos is unmaintained](https://github.com/p-e-w/argos/pull/106#issuecomment-573278743).

Not wanting to give up on my dreams of a more personalized GNOME setup, I decided to go through hell.

On paper Plug is Argos/BitBar... except not really, this will not be backward compatible with neither of them, it will support less technical features like eval, but allows more UI widgets like sliders and toggles.

### Examples

TODO


### Installation

Not available through the [GNOME Extensions Website](https://extensions.gnome.org/) (yet anyway).

Here's how to install it manually:

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
git clone https://github.com/[user]/[plug-plugin]
```

### Creating Plugins

TODO