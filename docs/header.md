[MDGarden](index.md){.header_title}

- [What is it?](what_is_it.md)
- [Getting started](getting_started.md)
- [Sigle File Wiki/inline mode](inline_mode.md)
- [Multi File Wiki/include mode](include_mode.md)
- [Plug-ins](plugins.md)
- [Author Mode](author_mode.md)
- [Jorro](jorro.md)
- [API](api.md)
- [Copyrights/Credits](credits.md)
- [Markdown Cheat Sheet](markdown.md)

<div class="hamburger"><span></span><span></span><span></span><span></span></div>

<style>
  header > md-garden > section{
    max-width:initial;
    width:100%;
    padding:10px;
    display: flex;
    position:relative;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    background: rgba(255, 255, 255, 0.9);
    height: 60px;
  }
    header > md-garden > section p{
      display:block;
      margin-bottom:initial;
    }
  header > md-garden > .hamburger a,
  header > md-garden > .hamburger a:visited{
    color: #fff;
  }
  .header_title{
    display: inline-block;
    font-size: 22px;
    font-weight: 100;
    margin-left: 64px;
    font-weight: 100;
    text-decoration:none !important;
    margin-left: 60px;
  }
  .hamburger{
    position:absolute;
    left:10px;
    top:10px;
    width: 44px;
    height: 44px;
    z-index: 1000;
    cursor: pointer;
  }
  .hamburger>span{
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    margin: auto;
    width: 30px;
    height: 1.5px;
    background: #999;
    -webkit-transition: 200ms ease-in-out;
    transition: 200ms ease-in-out;
  }
  .hamburger>span:nth-child(1) {
    top: 10px;
  }
  .hamburger>span:nth-child(2),
  .hamburger>span:nth-child(3){
    top: 20px;
  }
  .hamburger>span:nth-child(4) {
    top: 30px;
  }
  header section.open .hamburger>span:nth-child(1) {
    transform: translateY(-6px);
    opacity: 0;
  }
  header section.open .hamburger>span:nth-child(2) {
    transform: rotate(-45deg);
  }
  header section.open .hamburger>span:nth-child(3) {
    transform: rotate(45deg);
  }
  header section.open .hamburger>span:nth-child(4) {
    transform: translateY(6px);
    opacity: 0;
  }
  header section ul{
    z-index: 100;
    display: none;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    position: absolute;
    overflow: scroll;
    margin: 0;
    padding: 20px;
    padding-top: 80px;
    padding-left: 30px;
    padding-bottom: 60px;
    padding-bottom: 60px;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    /* background-color: rgba(0,0,0,0.7); */
    opacity: 0;
    backdrop-filter: blur(12px);
  }
  header section ul li{
    grid-column:1/2;
    grid-row:1/2;
    width:fit-content;
    font-size:1rem;
    line-height:2;
  }
  header section ul li::before{
    content: none;
  }
  header section ul a:hover {
    border-bottom:1px solid #fff;
  }
  header section ul a:visited {
    color :#999;
  }
  header section ul li::after{
    content:none;
  }
  header section.open ul{
    position:fixed;
    opacity:1;
    display:flex;
    animation: fade-in .2s cubic-bezier(0, 0, 0.2, 1) 0s forwards;
  }
  header section.close ul{
    position:fixed;
    opacity:1;
    display:flex;
    animation: fade-out .2s cubic-bezier(0, 0, 0.2, 1) 0s forwards;
  }
  @keyframes fade-in {
    0%{
      opacity: 0;
    }
    100%{
      opacity: 1;
    }
  }
  @keyframes fade-out {
    0%{
      opacity: 1;
    }
    100%{
      opacity: 0;
    }
  }
</style>

<script>
  var hamburger = document.querySelector(".hamburger");
  hamburger.addEventListener('click',(e)=>{
    var hamburger = e.currentTarget;
    var section = hamburger.closest('section');
    if(section.classList.contains("open")){
      section.classList.add("close");
      section.classList.remove("open")
      window.setTimeout(()=>{
        section.classList.remove("close")
      },500)
    }else{
      section.classList.add("open");
    }
  })
  var link = document.querySelectorAll("header ul li a");
  link.forEach((element,index)=>{
    element.addEventListener('click',(e)=>{
      var section = e.currentTarget.closest('section');
      section.classList.toggle("open");
    })
  })
</script>
