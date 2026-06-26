/* Javascript used on all sites. */

window.addEvent('domready', function() {
    // Init the zooming on the HeroImage.


    /*
    var base_image = $('HeroImage').get('data-base-img-src');
    var image_title = $('HeroImage').get('data-img-title');
    var image_desc = $('HeroImage').get('data-img-desc');

    canvas_view_init(
        'HeroImageContainer',
        base_image,
        {
            showcontrols: 'auto',
            title: image_title,
            description: image_desc
        }
    );
    */

    if ($('imageReset')) {
        $('imageReset').addEvent('click', function(e) {
            e.stop();
        });
    }
    // Add flagged Flag to the hero image (if required).
    tagFlaggedItems($('hero_image_container'), null, null);

    if ($('imageDownload')) {
        $('imageDownloadWrap').addEvent('click', function(e) {

            var lot_id = this.get('data-lot-id');

            var alert_email = new Request.JSON({
                url : '/auctions/send_press_download_email/' + lot_id + '/',
                noCache: true,
                async: false,
                onSuccess : function(jsonObj) {
                    // do nothing
                }
            }).get();

        });
    }

});
