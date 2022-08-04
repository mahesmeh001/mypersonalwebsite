let slideIndex = 1;
let e=1;
showSlides(slideIndex,e);

function plusSlides(n,e) {
    showSlides(slideIndex += n,e);
}

function currentSlide(n,e) {
    showSlides(slideIndex = n,e);
}

function showSlides(n,e) {
    let i;
    let slides;
    let dots;
    switch (e){
        case 1:
            slides = document.getElementsByClassName("mySlides");
            dots = document.getElementsByClassName("dot");
            break;
        case 2:
            slides = document.getElementsByClassName("mySlides2");
            dots = document.getElementsByClassName("dot2");
            break;
        case 3:
            slides = document.getElementsByClassName("mySlides3");
            dots = document.getElementsByClassName("dot3");
            break;
        case 4:
            slides = document.getElementsByClassName("mySlides4");
            dots = document.getElementsByClassName("dot4");
            break;
        case 5:
            slides = document.getElementsByClassName("mySlides5");
            dots = document.getElementsByClassName("dot5");
            break;
        case 6:
            slides = document.getElementsByClassName("mySlides6");
            dots = document.getElementsByClassName("dot6");
            break;
        case 7:
            slides = document.getElementsByClassName("mySlides7");
            dots = document.getElementsByClassName("dot7");
            break;
        case 8:
            slides = document.getElementsByClassName("mySlides8");
            dots = document.getElementsByClassName("dot8");
            break;
        case 9:
            slides = document.getElementsByClassName("mySlides9");
            dots = document.getElementsByClassName("dot9");
            break;
        case 10:
            slides = document.getElementsByClassName("mySlides10");
            dots = document.getElementsByClassName("dot10");
            break;
        case 11:
            slides = document.getElementsByClassName("mySlides11");
            dots = document.getElementsByClassName("dot11");
            break;
        case 12:
            slides = document.getElementsByClassName("mySlides12");
            dots = document.getElementsByClassName("dot12");
            break;
        case 13:
            slides = document.getElementsByClassName("mySlides13");
            dots = document.getElementsByClassName("dot13");
            break;
        case 14:
            slides = document.getElementsByClassName("mySlides14");
            dots = document.getElementsByClassName("dot14");
            break;
    }


    if (n > slides.length) {slideIndex = 1}
    if (n < 1) {slideIndex = slides.length}
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active", "");
    }
    slides[slideIndex-1].style.display = "block";
    dots[slideIndex-1].className += " active";
}