import gsap from 'gsap';

let isMuseumOpen = false;

export function initMuseumRoom() {
    const closeBtn = document.getElementById('close-museum-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeMuseumRoom);
    }
}

export function openMuseumRoom(category, districtName) {
    if (isMuseumOpen) return;
    isMuseumOpen = true;

    const overlay = document.getElementById('museum-room-ui');
    const breadcrumbs = document.getElementById('museum-breadcrumbs');
    const content = document.getElementById('museum-content');
    const mapCanvas = document.getElementById('map-canvas');

    if (!overlay || !content) return;

    breadcrumbs.textContent = `ATLAS // ${districtName.toUpperCase()} // ${category.toUpperCase()}`;
    
    // Clear previous content
    content.innerHTML = '';

    // Render module based on category
    if (category === 'river') {
        content.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 10vh 5vw;">
                <h1 style="font-family: 'Neue Machina', sans-serif; font-size: 8vw; color: var(--bauhaus-white); line-height: 0.9; text-transform: uppercase;">THE VEINS OF<br><span style="color: var(--bauhaus-blue);">DEVBHOOMI</span></h1>
                <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 50px; width: 100%; max-width: 1200px;">
                    <div style="border: 2px solid var(--bauhaus-white); padding: 40px; color: white;">
                        <h3 style="font-family: 'Space Mono', monospace; color: var(--bauhaus-blue); margin-bottom: 20px;">FLOW DATA</h3>
                        <p style="font-size: 1.5rem; line-height: 1.5;">The rivers of Uttarakhand are not just water; they are the physical manifestation of time eroding the Himalayas. In ${districtName}, the kinetic energy of these rivers powers entire valleys.</p>
                        <div style="margin-top: 40px; font-family: 'Space Mono', monospace; font-size: 3rem; font-weight: bold;">[ RIVER SIMULATION PENDING ]</div>
                    </div>
                    <div style="background: var(--bauhaus-blue); height: 400px; display: flex; align-items: center; justify-content: center; color: var(--bauhaus-black); font-family: 'Neue Machina', sans-serif; font-size: 2rem; font-weight: 800;">
                        HYDROLOGICAL GRAPHIC HERE
                    </div>
                </div>
            </div>
        `;
    } else if (category === 'culture' || category === 'heritage') {
        // Move the Living Archive into this room
        const hologramArchive = document.getElementById('living-archive-ui');
        const closeHoloBtn = document.getElementById('close-archive-btn');
        if (hologramArchive) {
            hologramArchive.style.position = 'relative';
            hologramArchive.style.opacity = '1';
            hologramArchive.style.pointerEvents = 'all';
            hologramArchive.style.zIndex = '1';
            hologramArchive.style.height = '100%';
            if (closeHoloBtn) closeHoloBtn.style.display = 'none'; // Hide redundant close button
            content.appendChild(hologramArchive);
        }
    } else {
        content.innerHTML = `
            <div style="display: flex; height: 80vh; align-items: center; justify-content: center; flex-direction: column;">
                <h1 style="font-family: 'Neue Machina', sans-serif; font-size: 10vw; color: var(--bauhaus-white);">${category.toUpperCase()}</h1>
                <p style="font-family: 'Space Mono', monospace; color: var(--bauhaus-red); font-size: 2rem;">MODULE CONSTRUCTION IN PROGRESS</p>
            </div>
        `;
    }

    // Animation: Fade out map, fade in museum
    if (mapCanvas) gsap.to(mapCanvas, { opacity: 0, duration: 1.0 });
    overlay.classList.add('active');
    
    // Play transition sound
    if (typeof window.SoundEngine !== 'undefined' && window.SoundEngine.isInitialized) {
        window.SoundEngine.playOvertone(150, 1.5);
    }
}

export function closeMuseumRoom() {
    if (!isMuseumOpen) return;
    
    const overlay = document.getElementById('museum-room-ui');
    const mapCanvas = document.getElementById('map-canvas');
    
    // Return living archive to original spot if it was moved
    const hologramArchive = document.getElementById('living-archive-ui');
    const closeHoloBtn = document.getElementById('close-archive-btn');
    const content = document.getElementById('museum-content');
    if (hologramArchive && content.contains(hologramArchive)) {
        hologramArchive.style.position = 'fixed';
        hologramArchive.style.opacity = '0';
        hologramArchive.style.pointerEvents = 'none';
        hologramArchive.style.zIndex = '300';
        if (closeHoloBtn) closeHoloBtn.style.display = 'block'; // Restore button
        document.getElementById('app').appendChild(hologramArchive);
    }
    
    overlay.classList.remove('active');
    if (mapCanvas) gsap.to(mapCanvas, { opacity: 1, duration: 1.0 });
    
    isMuseumOpen = false;
}
