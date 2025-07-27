# Product Requirements Document: Terminal File Commander (TFC)

1. Vision

To recreate the classic, efficient, two-pane file management experience of Norton Commander within a modern terminal environment. TFC will provide powerful keyboard-driven file operations, navigation, and system interaction, leveraging the component-based UI paradigm of Ink and React for a responsive and maintainable application.

2. Core Features

The initial version of TFC will focus on the most iconic features of Norton Commander:

- 2.1. Dual-Pane User Interface
  - The screen will be divided into two independent, side-by-side file panels.
  - Each panel will display a list of files and directories for its current path.
  - A status bar at the bottom of each panel will show details of the selected file (name, size, modification date).
  - One panel will be "active" at any given time, indicated by a distinct visual style (e.g., a highlighted border or cursor).

- 2.2. File & Directory Navigation
  - Arrow Keys (`Up`/`Down`): Navigate the file list within the active panel.
  - `Enter` Key:
    - On a directory: Change the panel's current path to that directory.
    - On a file: Execute the file using the system's default application.
  - `Tab` Key: Switch the active focus between the two panels.
  - `..` (Parent Directory): A .. entry will always be present at the top of the file list to navigate up one level.

- 2.3. Core File Operations (Function Keys)
  - F3 (View): Open a read-only viewer for the selected file's content.
  - F4 (Edit): Open the selected file in the user's default terminal editor ($EDITOR or vim/nano).
  - F5 (Copy): Copy the selected file(s) from the active panel to the directory of the inactive panel.
  - F6 (Move): Move the selected file(s) from the active panel to the directory of the inactive panel.
  - F7 (MkDir): Prompt the user to create a new directory in the active panel's path.
  - F8 (Delete): Prompt for confirmation before deleting the selected file(s).

- 2.4. Visual Styling
  - The application will adopt a classic "DOS-era" blue background theme.
  - Directories, files, and the selected item will have distinct colors for easy identification.
  - A persistent bottom menu bar will display the mapping of function keys to their actions (e.g., F3 View, F5 Copy).

- 2.5. Integrated Command Line
  - A command prompt will be present at the bottom of the screen.
  - Users can type and execute arbitrary shell commands directly from this prompt.

3. Technical Stack

The project will be a Node.js application built with the following technologies, inspired by the architecture of gemini-cli:

- Language: TypeScript for type safety and modern language features.
- Core Framework:
  - Node.js: The runtime environment.
  - Ink: The core library for building the terminal UI with React.
  - React: For creating the component-based UI structure.
- Key Libraries:
  - `fs-extra`: A robust replacement for the native fs module, providing promise-based methods and simplifying file operations like copy and move.
  - `chokidar`: A more reliable file system watcher than the native fs.watch. It will be used to automatically refresh a panel's view when its
    directory contents change on disk.
  - `yargs` or `commander`: For parsing initial command-line arguments, such as specifying starting paths for the panels (e.g., tfc /path/one
    /path/two).
  - `chalk`: For advanced text styling if Ink's built-in color props are insufficient.

4. High-Level Architecture

The application's UI will be structured into a hierarchy of React components:

- `App.tsx`: The root component. It will manage the overall application state, including the paths and file lists for both panels and which panel is
  currently active.
- `Panel.tsx`: A reusable component that takes a path and a list of files as props and renders one of the two main file panes. It will manage its own
  internal state for the selected file index.
- `MenuBar.tsx`: A static component that displays the function key commands at the bottom of the screen.
- `CommandLine.tsx`: A component for the integrated command-line input at the bottom.
- `hooks/useFileSystem.ts`: A custom hook to encapsulate all file system logic: reading directory contents, getting file stats, and performing file
  operations (copy, move, delete). This keeps the UI components clean of direct fs calls.
- `hooks/useInputHandler.ts`: A custom hook that will use Ink's useInput to capture and process all keyboard input, mapping keys like F5, Tab, and arrows
  to the appropriate actions.
