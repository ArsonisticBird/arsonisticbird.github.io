/* Javascript specific to the Desktop site. */

function ClickThumbnails() {
    /*
     * Add an event to each thumbnail: when we click on it, it replaces the
     * HeroImage.
     */
    var LotThumbnails = $('LotThumbnails');
    if (LotThumbnails == null) {
        return;
    }
    var thumbnails = LotThumbnails.getElements('img');
    thumbnails.addEvent('click', function(e) {
        // When user clicks on thumbnail, load image as HeroImage.
        var currentHeroImage = this.id;
        var thumbnail = ImageThumbnails[currentHeroImage];
        var hero_image = $('hero_image_container').getElement('img');
        hero_image.src = thumbnail.src;

        canvas_view_init_image(hero_image, {showcontrols: 'yes'});
        // if the thumbnail has a PressSrc replace the download link with this
        if (thumbnail['PressSrc']) {
            $('imageDownload').set('href', thumbnail['PressSrc']);
        }

    });
}

window.addEvent('domready', function() {
    ClickThumbnails();

    var ClickForMore = $('ClickForMore');
    if (ClickForMore != null) {
        ClickForMore.addEvent('click', function(e) {
            var images = $('LotThumbnails').getElements('img');
            var start = ThumbnailRow * 3;
            for ( var i = start; i < start + 3; i++) {
                if (i >= images.length)
                    break;
                images[i].src = ImageThumbnails[images[i].id].ThumbnailSrc;
                images[i].removeClass('hidden');
            }
            if (i >= images.length) {
                // Hide the "Click for image" so that users stop clicking on it!
                // PS can't use class .hidden as it will not override the
                // default 'display'.
                ClickForMore.set('style', 'display: none');
            }
            ThumbnailRow++;
            return false;
        });
    }

});
