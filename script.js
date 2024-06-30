console.log("Welcome to Spotify");

// Initialize the Variables
let songIndex = 0;
let audioElement = new Audio('songs/1.mp3');
let masterPlay = document.getElementById('masterPlay');
let myProgressBar = document.getElementById('myProgressBar');
let gif = document.getElementById('gif');
let masterSongName = document.getElementById('masterSongName');
let songItems = Array.from(document.getElementsByClassName('songItem'));

let songs = [
    {songName: "Dilbara", filePath: "songs/1.mp3", coverPath: "covers/1.jpg"},
    {songName: "Thuglove", filePath: "songs/2.mp3", coverPath: "covers/2.jpg"},
    {songName: "Le Le Ram Ram", filePath: "songs/3.mp3", coverPath: "covers/3.jpg"},
    {songName: "Haule Haule", filePath: "songs/4.mp3", coverPath: "covers/4.jpg"},
    {songName: "Salaam Aaya", filePath: "songs/5.mp3", coverPath: "covers/5.jpg"},
    {songName: "Ambersariya", filePath: "songs/6.mp3", coverPath: "covers/6.jpg"},
    {songName: "O re piya", filePath: "songs/7.mp3", coverPath: "covers/7.jpg"},
    {songName: "Kya Loge Tum", filePath: "songs/8.mp3", coverPath: "covers/8.jpg"},
    {songName: "Husna", filePath: "songs/9.mp3", coverPath: "covers/9.jpg"},
    {songName: "Luv Letter", filePath: "songs/10.mp3", coverPath: "covers/9.jpg"},
    {songName: "Bhare Naina Ra One", filePath: "songs/11.mp3", coverPath: "covers/10.jpg"},
    {songName: "Devil Eyes", filePath: "songs/12.mp3", coverPath: "covers/10.jpg"},
    {songName: "Haryane Ka Jaat", filePath: "songs/13.mp3", coverPath: "covers/10.jpg"},
    {songName: "Hornn Blow ", filePath: "songs/14.mp3", coverPath: "covers/10.jpg"},
    {songName: "Moti Chain", filePath: "songs/15.mp3", coverPath: "covers/10.jpg"},
    {songName: "Paisa Hai Toh", filePath: "songs/16.mp3", coverPath: "covers/10.jpg"},
    {songName: "Piya Ghar Aavenge", filePath: "songs/17.mp3", coverPath: "covers/10.jpg"},
    {songName: "Psycho Saiyaan Saaho", filePath: "songs/18.mp3", coverPath: "covers/10.jpg"},
    {songName: "Smack That", filePath: "songs/19.mp3", coverPath: "covers/10.jpg"},
    {songName: "Summertime Sadness", filePath: "songs/21.mp3", coverPath: "covers/10.jpg"},
    {songName: "Wakhra Swag", filePath: "songs/21.mp3", coverPath: "covers/10.jpg"},

    {songName: "Acordeo Funk", filePath: "songs/22.mp3", coverPath: "covers/10.jpg"},
    {songName: "BiBi Funk", filePath: "songs/23.mp3", coverPath: "covers/10.jpg"},
    {songName: "Courtey Call", filePath: "songs/24.mp3", coverPath: "covers/10.jpg"},
    {songName: "Royalty", filePath: "songs/25.mp3", coverPath: "covers/10.jpg"},
    {songName: "Devo ke Dev Mahadev", filePath: "songs/26.mp3", coverPath: "covers/10.jpg"},
    
]

songItems.forEach((element, i)=>{ 
    element.getElementsByTagName("img")[0].src = songs[i].coverPath; 
    element.getElementsByClassName("songName")[0].innerText = songs[i].songName; 
})
 

// Handle play/pause click
masterPlay.addEventListener('click', ()=>{
    if(audioElement.paused || audioElement.currentTime<=0){
        audioElement.play();
        masterPlay.classList.remove('fa-play-circle');
        masterPlay.classList.add('fa-pause-circle');
        gif.style.opacity = 1;
    }
    else{
        audioElement.pause();
        masterPlay.classList.remove('fa-pause-circle');
        masterPlay.classList.add('fa-play-circle');
        gif.style.opacity = 0;
    }
})
// Listen to Events
audioElement.addEventListener('timeupdate', ()=>{ 
    // Update Seekbar
    progress = parseInt((audioElement.currentTime/audioElement.duration)* 100); 
    myProgressBar.value = progress;
})

myProgressBar.addEventListener('change', ()=>{
    audioElement.currentTime = myProgressBar.value * audioElement.duration/100;
})

const makeAllPlays = ()=>{
    Array.from(document.getElementsByClassName('songItemPlay')).forEach((element)=>{
        element.classList.remove('fa-pause-circle');
        element.classList.add('fa-play-circle');
    })
}

Array.from(document.getElementsByClassName('songItemPlay')).forEach((element)=>{
    element.addEventListener('click', (e)=>{ 
        makeAllPlays();
        songIndex = parseInt(e.target.id);
        e.target.classList.remove('fa-play-circle');
        e.target.classList.add('fa-pause-circle');
        audioElement.src = `songs/${songIndex+1}.mp3`;
        masterSongName.innerText = songs[songIndex].songName;
        audioElement.currentTime = 0;
        audioElement.play();
        gif.style.opacity = 1;
        masterPlay.classList.remove('fa-play-circle');
        masterPlay.classList.add('fa-pause-circle');
    })
})

document.getElementById('next').addEventListener('click', ()=>{
    if(songIndex>=25){
        songIndex = 0
    }
    else{
        songIndex += 1;
    }
    audioElement.src = `songs/${songIndex+1}.mp3`;
    masterSongName.innerText = songs[songIndex].songName;
    audioElement.currentTime = 0;
    audioElement.play();
    masterPlay.classList.remove('fa-play-circle');
    masterPlay.classList.add('fa-pause-circle');

})

document.getElementById('previous').addEventListener('click', ()=>{
    if(songIndex<=0){
        songIndex = 0
    }
    else{
        songIndex -= 1;
    }
    audioElement.src = `songs/${songIndex+1}.mp3`;
    masterSongName.innerText = songs[songIndex].songName;
    audioElement.currentTime = 0;
    audioElement.play();
    masterPlay.classList.remove('fa-play-circle');
    masterPlay.classList.add('fa-pause-circle');
})
