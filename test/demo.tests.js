define(['jquery', 'underscore'], function($, _) {
    describe('just checking', function() {
        it('works for underscore', function() {
            // just checking that _ works
            expect(_.size([1,2,3])).to.equal(3);
        });
    });
});
