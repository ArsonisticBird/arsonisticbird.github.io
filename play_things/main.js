var story;
const themes_list = ["light", "dark", "green", "burned"]
var theme_current = "burned";

var inkSystem = (function(storyContent) {

    // Create ink story from the content using inkjs
    story = new inkjs.Story(storyContent);
	
	var delaySpeed = 100.0;
	var scrollSpeed = 200.0;

	var forceClear = true;
	var autoscrollText = false;
	
	var storyChunkCurrent = 0;
	var storyChunkObjects = [];

    let savedTheme;
	
	let inBackgroundColor;
	let inAccentColor;
	let inTextColor;
	let inSeparatorColor;
	
	let customThemeElement;
	let visualOptions;
	let visualOptionsSwitch;
	
    let globalTagTheme;

    // Global tags - those at the top of the ink file
    // We support:
    //  # theme: dark
    //  # author: Your Name
    var globalTags = story.globalTags;
    if( globalTags ) {
        for(var i=0; i<story.globalTags.length; i++) {
            var globalTag = story.globalTags[i];
            var splitTag = splitPropertyTag(globalTag);

            // THEME: dark
            if( splitTag && splitTag.property == "theme" ) {
                globalTagTheme = splitTag.val;
            }

            // author: Your Name
            else if( splitTag && splitTag.property == "author" ) {
                var byline = document.querySelector('.byline');
                byline.innerHTML = "by "+splitTag.val;
            }
        }
    }

    var storyContainer = document.querySelector('#story');
	var footer = document.querySelector('#footer');
	var positionSlider = document.querySelector('#positionSlider');
	var storyParagraphs = document.querySelector('#story-paragraphs');
	var storyChoices = document.querySelector('#story-choices');
	positionSlider.addEventListener("mouseup",releaseSlider);
	positionSlider.addEventListener("touchend",releaseSlider);
	var positionLabel = document.querySelector('#positionLabel');
    var outerScrollContainer = document.querySelector('.outerContainer');

    // page features setup
    setupTheme(globalTagTheme);
	
	// hook up the buttons
    setupButtons();

    // Kick off the start of the story!
    // continueStory(true);
	startStoryChunk();
	
	const clamp = (num, a, b) => Math.max(Math.min(num, Math.max(a, b)), Math.min(a, b));
	
	var displayDelay = 0;
	
	function goToNextStoryChunk()
	{
		goToStoryChunk(storyChunkCurrent+1);
	}
	
	function goToPreviousStoryChunk()
	{
		goToStoryChunk(storyChunkCurrent-1);
	}
	
	function goToStoryChunk(index)
	{
		storyChunkCurrent = clamp(index, 0, storyChunkObjects.length-1);
		story.variablesState.$('current_paragraph_index', storyChunkCurrent);
	}
	
	function clearStoryDisplay()
	{
		removeAll("p");
		removeAll("img");
		removeAll(".separator");
		removeAll(".header");
		displayDelay = 0.0;
		outerScrollContainer.scrollTo(0,0);
	}
	
	function updateStoryDisplay()
	{
		clearStoryDisplay();
		updateSlider();
		updatePositionLabel();
		displayParagraphs();
		displayChoices();
	}
	
	function updatePositionLabel()
	{
		positionLabel.innerHTML = `${storyChunkCurrent+1} / ${storyChunkObjects.length}`;
	}
	
	function updateSlider()
	{
		positionSlider.max = storyChunkObjects.length-1;
		if (storyChunkObjects.length > 1)
		{
			footer.classList.remove("hidden");
		}
		else
		{
			footer.classList.add("hidden");
		}
		positionSlider.value = storyChunkCurrent;
	}
	
	function releaseSlider()
	{
		goToStoryChunk(this.value);
		updateStoryDisplay();
	}
	
	function displayParagraphs()
	{
		storyChunkObjects[storyChunkCurrent].paragraphs.forEach(function(paragraph) {
			
			// Create paragraph element (initially hidden)
			var paragraphElement = document.createElement('p');
			paragraphElement.innerHTML = paragraph;
			storyParagraphs.appendChild(paragraphElement);

			// Fade in paragraph after a short delay
			showAfter(displayDelay, paragraphElement);
			displayDelay += delaySpeed;
		});
	}
	
	function displayFalseChoice()
	{
		var choiceText = storyChunkObjects[storyChunkCurrent].choices[0].text;
		
		// Create paragraph with anchor element
		var choiceParagraphElement = document.createElement('p');
		choiceParagraphElement.classList.add("choice");
		choiceParagraphElement.innerHTML = `<a href='#'>${choiceText}</a>`
		storyChoices.appendChild(choiceParagraphElement);
		
		// Fade in paragraph after a short delay
		showAfter(displayDelay, choiceParagraphElement);
		displayDelay += delaySpeed;
		
		var choiceAnchorEl = choiceParagraphElement.querySelectorAll("a")[0]; // get link text
		choiceAnchorEl.addEventListener("click", function(event) {
			// Don't follow <a> link
			event.preventDefault();
			
			// Go to the next chunk
			goToNextStoryChunk();
			
			// update the display
			updateStoryDisplay();
		});
	}
	
	function displayRealChoices()
	{
		// Create HTML choices from ink choices
        storyChunkObjects[storyChunkCurrent].choices.forEach(function(choice) {
				
			var delay = delaySpeed;
			
			// Create paragraph with anchor element
			var choiceParagraphElement = document.createElement('p');
			choiceParagraphElement.classList.add("choice");
			choiceParagraphElement.innerHTML = `<a href='#'>${choice.text}</a>`
			storyChoices.appendChild(choiceParagraphElement);

			// Fade choice in after a short delay
			showAfter(delay, choiceParagraphElement);
			delay += delaySpeed;

			// Click on choice
			var choiceAnchorEl = choiceParagraphElement.querySelectorAll("a")[0];
			choiceAnchorEl.addEventListener("click", function(event) {

				// Don't follow <a> link
				event.preventDefault();

				// Tell the story where to go next
				story.ChooseChoiceIndex(choice.index);
				
				// Aaand loop
				startStoryChunk();
			});
		});
	}
	
	function displayChoices()
	{
		if (storyChunkObjects[storyChunkCurrent].choices.length == 1)
		{
			displayFalseChoice();
		}
		else
		{
			displayRealChoices();
		}
	}
	
	function startStoryChunk()
	{
		storyChunkCurrent = 0;
		storyChunkObjects = [];
		readStoryChunks();
		updateStoryDisplay();
		positionSlider.value = 0;
	}
	
	function readStoryChunks(){
		var paragraphs = []		
		while(story.canContinue)
		{
			paragraphs.push(story.Continue())
		}
		storyChunkObjects.push({paragraphs:paragraphs, choices: [...story.currentChoices]});
		if (story.currentChoices.length==1) // if we have one and only one choice
		{
			story.ChooseChoiceIndex(0); // choose that choice, and keep reading
			readStoryChunks();
		}
	}
	
	var LEFT_ARROW = [37, 65];
	var RIGHT_ARROW = [39, 68];
	
	document.onkeydown = function (e) {
		if (RIGHT_ARROW.indexOf(e.keyCode) != -1)
		{
			goToNextStoryChunk();
			updateStoryDisplay();
		}
		if (LEFT_ARROW.indexOf(e.keyCode) != -1)
		{
			goToPreviousStoryChunk();
			updateStoryDisplay();
		}
	};
	
	function update_container()
	{
		if(!forceClear)
		{
			storyContainer.style.height = contentBottomEdgeY()+"px";
		}
	}

    function restart() {
        story.ResetState();

        setVisible(".header", true);

        startStoryChunk();

        outerScrollContainer.scrollTo(0, 0);
    }

    // -----------------------------------
    // Various Helper functions
    // -----------------------------------

    // Fades in an element after a specified delay
    function showAfter(delay, el) {
        el.classList.add("hide");
        setTimeout(function() { 
			el.classList.remove("hide");
			update_container();
			}, delay);
    }

    // Scrolls the page down, but no further than the bottom edge of what you could
    // see previously, so it doesn't go too far.
    function scrollDown(previousBottomEdge) {
		if(autoscrollText)
		{
			// Line up top of screen with the bottom of where the previous content ended
			var target = previousBottomEdge;

			// Can't go further than the very bottom of the page
			var limit = outerScrollContainer.scrollHeight - outerScrollContainer.clientHeight;
			if( target > limit ) target = limit;
			//target = limit;
			console.log(target, limit);

			var start = outerScrollContainer.scrollTop;

			var dist = target - start;
			var duration = scrollSpeed + scrollSpeed*dist/100;
			var startTime = null;
			function step(time) {
				if( startTime == null ) startTime = time;
				var t = (time-startTime) / duration;
				var lerp = 3*t*t - 2*t*t*t; // ease in/out
				outerScrollContainer.scrollTo(0, (1.0-lerp)*start + lerp*target);
				if( t < 1 ) requestAnimationFrame(step);
			}
			requestAnimationFrame(step);
		}
    }

    // The Y coordinate of the bottom end of all the story content, used
    // for growing the container, and deciding how far to scroll.
    function contentBottomEdgeY() {
        var bottomElement = storyContainer.lastElementChild;
        return bottomElement ? bottomElement.offsetTop + bottomElement.offsetHeight : 0;
    }

    // Remove all elements that match the given selector. Used for removing choices after
    // you've picked one, as well as for the CLEAR and RESTART tags.
    function removeAll(selector)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            el.parentNode.removeChild(el);
        }
    }

    // Used for hiding and showing the header when you CLEAR or RESTART the story respectively.
    function setVisible(selector, visible)
    {
        var allElements = storyContainer.querySelectorAll(selector);
        for(var i=0; i<allElements.length; i++) {
            var el = allElements[i];
            if( !visible )
                el.classList.add("invisible");
            else
                el.classList.remove("invisible");
        }
    }

	function downloadJsonFile(data, filename){
        // Creating a blob object from non-blob data using the Blob constructor
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // Create a new anchor element
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'download';
        a.click();
        a.remove();
	}

	function downloadSave(){
		downloadJsonFile(story.state.toJson(), "play_things_save.json");
	}

	function loadAndUpdateFromCurrentState()
	{
		story.ChoosePathString(story.variablesState.$('chapter_choice')._componentsString)
		var current_index = story.variablesState.$('current_paragraph_index');
		startStoryChunk();
		goToStoryChunk(current_index);
		updateStoryDisplay();
	}

    // Helper for parsing out tags of the form:
    //  # PROPERTY: value
    // e.g. IMAGE: source path
    function splitPropertyTag(tag) {
        var propertySplitIdx = tag.indexOf(":");
        if( propertySplitIdx != null ) {
            var property = tag.substr(0, propertySplitIdx).trim();
            var val = tag.substr(propertySplitIdx+1).trim();
            return {
                property: property,
                val: val
            };
        }
        return null;
    }

    // Loads save state if exists in the browser memory
    function loadSavePoint() {

        try {
            let savedState = window.localStorage.getItem('save-state');
            if (savedState) {
                story.state.LoadJson(savedState);
                return true;
            }
        } catch (e) {
            console.debug("Couldn't load save state");
        }
        return false;
    }

    // Detects which theme (light or dark) to use
    function setupTheme(globalTagTheme) {

        // load theme from browser memory
        var savedTheme;
        try {
            savedTheme = window.localStorage.getItem('theme');
        } catch (e) {
            console.debug("Couldn't load saved theme");
        }

        // Check whether the OS/browser is configured for dark mode
        var browserDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark"
            || (savedTheme == undefined && globalTagTheme === "dark")
            || (savedTheme == undefined && globalTagTheme == undefined && browserDark))
            document.body.classList.add("dark");
    }
	
	function nextTheme()
	{
		let next_index = themes_list.indexOf(theme_current) + 1;
		if(next_index == 0)
		{
			return "light";
		}
		if(next_index > themes_list.length - 1)
		{
			next_index = 0;
		}
		return themes_list[next_index];
	}
	
	const rgba2hex = (rgba) => `#${rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+\.{0,1}\d*))?\)$/).slice(1).map((n, i) => (i === 3 ? Math.round(parseFloat(n) * 255) : parseFloat(n)).toString(16).padStart(2, '0').replace('NaN', '')).join('')}`
	
	function updateOptionColors()
	{
		let body_style = getComputedStyle(document.body);
		inBackgroundColor.value = rgba2hex(body_style.backgroundColor);
		inAccentColor.value = rgba2hex(getComputedStyle(document.body.querySelector(".written-in-ink a")).color);
		inTextColor.value = rgba2hex(getComputedStyle(document.body.querySelector("#story p")).color);
		let sep = document.body.querySelector(".separator");
		if(sep){
			inSeparatorColor.value = rgba2hex(getComputedStyle(sep).backgroundColor);
		}
		
	}
	
	function hideVisualOptions(show)
	{
		if (show){
			visualOptions.classList.add("hidden");
			visualOptionsSwitch.innerHTML = "show visual options";
		}
		else {
			updateOptionColors();
			visualOptions.classList.remove("hidden");
			visualOptionsSwitch.innerHTML = "hide visual options";
		}
	}
	
	function cycleTheme()
	{
		document.body.classList.remove("custom-theme");
		document.body.classList.remove(theme_current);
		theme_current = nextTheme();
		document.body.classList.add(theme_current);
		updateOptionColors();
	}
	
	function setCustomTheme()
	{
		if(customThemeElement) // remove the old theme
		{
			document.body.classList.remove("custom-theme");
			customThemeElement.remove();
		}
		
		let themeText = createCustomThemeText(inBackgroundColor.value, inAccentColor.value, inTextColor.value, inSeparatorColor.value);
		
		customThemeElement = document.createElement("style");
		customThemeElement.type = 'text/css';
		customThemeElement.innerHTML = themeText;
		document.getElementsByTagName('head')[0].appendChild(customThemeElement);
		document.body.classList.add("custom-theme");
	}
	
	function createCustomThemeText(bgc, ac, tc, sc)
	{
		var tempstring =  `
body.custom-theme {
	background: <background-color>;
	color: <accent-color>;
}

.custom-theme h2 {
    color: <accent-color>;
}

.custom-theme .container {
    background: <background-color>;
}

.custom-theme .written-in-ink {
    background: <background-color>;
}

.custom-theme a {
    color: <accent-color>;
    transition: color 0.6s;
}

.custom-theme a:hover {
    color: <text-color>;
}

.custom-theme p {
    color: <text-color>;
    transition: color 0.6s;
}

.custom-theme #visual-options{
	color:<text-color>;
	background: <background-color>;
}

.custom-theme input {
	accent-color:  <accent-color>;
}

.custom-theme strong {
    color: <accent-color>;
}

.custom-theme #controls [disabled] {
    color: <accent-color>;
}

.custom-theme .end {
    color: <text-color>;
}

.custom-theme .separator {
	background-color: <separator-color>
}

.custom-theme #controls {
    background: <background-color>;
}`

		return tempstring.replaceAll('<background-color>',bgc).replaceAll('<text-color>',tc).replaceAll('<accent-color>', ac).replaceAll('<separator-color>',sc);
	}
	
	

    // Used to hook up the functionality for global functionality buttons
    function setupButtons() {

        let rewindEl = document.getElementById("rewind");
        if (rewindEl) rewindEl.addEventListener("click", function(event) {
			if (confirm("Are you sure you want to restart the game?"))
			{
				removeAll("p");
				removeAll("img");
				setVisible(".header", false);
				restart();
			};
        });

        let saveEl = document.getElementById("save");
        if (saveEl) saveEl.addEventListener("click", function(event) {
			downloadSave();
        });
		
        let quicksaveEl = document.getElementById("quick_save");
        if (quicksaveEl) quicksaveEl.addEventListener("click", function(event) {
			try {
                window.localStorage.setItem('save-state', story.state.toJson());
				alert("Game saved!");
            } catch (e) {
                console.warn("Couldn't save state");
				alert("Uh oh! We couldn't save the game for some reason!");
            }
        });
		
        let quickLoadEl = document.getElementById("quick_load");
        if (quickLoadEl) quickLoadEl.addEventListener("click", function(event) {
			try {
				let savedState = window.localStorage.getItem('save-state');
				if (savedState) {
					story.state.LoadJson(savedState);
					loadAndUpdateFromCurrentState();
				}
			} catch (e) {
				console.debug("Couldn't load save state");
			}
        });

        let reloadEl = document.getElementById("reload");
        reloadEl.addEventListener("click", function(event) {
			var input = document.createElement('input');
			input.type = 'file';
			input.onchange = e => { 
			   let file = e.target.files[0];
			   try{
				   let reader = new FileReader();
				   reader.onload = (event) => {
					   story.state.LoadJson(JSON.parse(event.target.result));
					   loadAndUpdateFromCurrentState();
				   }
				   reader.readAsText(file);
			   }
			   catch(e){
				   console.log("Cannot load json file.");
			   }
			}
			input.click();
        });

        let themeSwitchEl = document.getElementById("theme-switch");
		
        if (themeSwitchEl) themeSwitchEl.addEventListener("click", function(event) {
            hideVisualOptions(true);
			cycleTheme();
        });
		
		visualOptions = document.getElementById("visual-options");
        visualOptionsSwitch = document.getElementById("visual-options-switch");
        if (visualOptionsSwitch) visualOptionsSwitch.addEventListener("click", function(event) {
			if(visualOptions){
				let isHidden = visualOptions.classList.contains("hidden");
				hideVisualOptions(!isHidden);
			}
        });
		
		
        let spacersCheckEl = document.getElementById("show-spacers-check");
        if (spacersCheckEl) spacersCheckEl.addEventListener("change", function(event) {
            if(this.checked){
				document.body.classList.remove("hide-separators");
			}
			else{
				document.body.classList.add("hide-separators");
			}
        });
		
		let clearPageEl = document.getElementById("clear-page-check");
        if (clearPageEl) clearPageEl.addEventListener("change", function(event) {
			forceClear = this.checked;
		});
		
		let autoScrollEl = document.getElementById("autoscroll-check");
        if (autoScrollEl) autoScrollEl.addEventListener("change", function(event) {
			autoscrollText = this.checked;
		});
		
		let textWidthSlider = document.getElementById("text-width-slider");
		if (textWidthSlider) textWidthSlider.addEventListener("input", function(event) {
			var root = document.querySelector(':root');
			root.style.setProperty("--story-width", this.value + "px");
		});
		
		let textSizeSlider = document.getElementById("text-size-slider");
		if (textSizeSlider) textSizeSlider.addEventListener("input", function(event) {
			storyContainer.style.fontSize = this.value + "pt";
		});
		
		inBackgroundColor = document.getElementById("background-color-input");
		if (inBackgroundColor) inBackgroundColor.addEventListener("input", setCustomTheme);
		
		inAccentColor = document.getElementById("accent-color-input");
		if (inAccentColor) inAccentColor.addEventListener("input", setCustomTheme);
		
		inTextColor = document.getElementById("text-color-input");
		if (inTextColor) inTextColor.addEventListener("input", setCustomTheme);
		
		inSeparatorColor = document.getElementById("separator-color-input");
		if (inSeparatorColor) inSeparatorColor.addEventListener("input", setCustomTheme);
		
    }

})(storyContent);

const CONTINUE_KEYS = [32, 13]
const CHOICE_1_KEYS = [49, 104, 72]; // '1', 'h', 'H'
const CHOICE_2_KEYS = [50, 106, 74]; // '2', 'j', 'J'
const CHOICE_3_KEYS = [51, 107, 75]; // 3, 'k', 'K'
const CHOICE_4_KEYS = [52, 108, 76]; // '4', 'l', 'L'
const CHOICE_5_KEYS = [53];
const CHOICE_6_KEYS = [54];
const CHOICE_7_KEYS = [55];
const CHOICE_8_KEYS = [56];
const CHOICE_9_KEYS = [57];

// code provided by lukenbones
document.onkeypress = function (e) {
	var visible_choices_count = document.querySelectorAll('p.choice').length;
    if (visible_choices_count == 0) { return }
    e = e || window.event;
	
    if (visible_choices_count == 1) {
        if (CONTINUE_KEYS.indexOf(e.keyCode) != -1) {
            document.querySelector("p.choice a").click() // spacebar advances if there is only one choice
        } else if (CHOICE_1_KEYS.indexOf(e.keyCode) != -1) {
            document.querySelector("p.choice a").click() // a choice 1 key will also work
        }
    } else if (visible_choices_count > 1) {
        var desired_choice;
        if (CHOICE_1_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 1;
        } else if (CHOICE_2_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 2;
        } else if (CHOICE_3_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 3;
        } else if (CHOICE_4_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 4;
        } else if (CHOICE_5_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 5;
        } else if (CHOICE_6_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 6;
        } else if (CHOICE_7_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 7;
        } else if (CHOICE_8_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 8;
        } else if (CHOICE_9_KEYS.indexOf(e.keyCode) != -1) {
            desired_choice = 9;
        }
        if (desired_choice) {
            document.querySelectorAll('p.choice')[desired_choice-1].firstChild.click()
        }
    }
};