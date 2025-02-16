async function getShieldText(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const svgText = await response.text();

        // Parse the SVG string to a DOM Document
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

        // Find the <text> element containing the version.  Shields.io uses
        // predictable classes.  The version is in the second text element.
        const textElements = svgDoc.querySelectorAll(".shield-version");

        if (textElements.length > 0) {
            return textElements[0].textContent;
        } else {
            // Fallback for different shield structures or errors.  Try to get *any* text.
            const allTextElements = svgDoc.querySelectorAll("text");
            return Array.from(allTextElements).map(el => el.textContent).filter(txt => !txt.includes("release"))[0];
        }


    } catch (error) {
        console.error("Error fetching or parsing SVG:", error);
        return "Error: " + error.message; // Return an error message
    }
}

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });

        // If you get "parameter 1 is not of type 'Node'" error, see https://stackoverflow.com/a/77855838/492336
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}

let hasLookedUp = false;
waitForElm(".maven-metadata-value").then(async elm => {
    if (hasLookedUp) return;
    hasLookedUp = true;

    const versionsToLookup = [];
    console.log("Starting lookup of versions...");
    for (let v of Array.from(document.getElementsByClassName("maven-metadata-value"))) {
        versionsToLookup.push(v.id);
    }

    const imageUrl = 'https://img.shields.io/maven-metadata/v?color=forestgreen&label=release&metadataUrl=https%3A%2F%2Fldtteam.jfrog.io%2Fartifactory%2Fparchmentmc-internal%2Forg%2Fparchmentmc%2Fdata%2Fparchment-VERSION_GOES_HERE%2Fmaven-metadata.xml';
    const promises = versionsToLookup.map(version =>
        getShieldText(imageUrl.replace("VERSION_GOES_HERE", version)).then(text => {
            document.getElementById(version).textContent = text.replace("v", "");
        })
    );

    for (let i = 0; i < promises.length; i += 10) {
        await Promise.all(promises.slice(i, i + 10));
    }
});