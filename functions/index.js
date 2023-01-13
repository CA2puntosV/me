'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const path = require('path')
const moment = require('moment-timezone')
const fs = require('fs-extra')
const os = require('os')
const { Parser } = require('json2csv')

const firestore = admin.initializeApp(functions.config().functions);

exports.exportGetRestaurants = functions.region('europe-west2').https.onRequest(async (
    req,
    res,
    controllerCity,
    controllerZone,
    location,
    terrace,
    categories,
    markers,
    kilometres,
    allergenicSelect,
    map,
) => {
    try {
        var restaurantList = [];
        var validateCity = true;
        var validateZone = true;
        var validateTerrace = true;
        var validateCategory = true;
        var validateNearbyMarkers = true;
        var radiusEarth = 6371;

        var nearbyMarkers = {};
        var newMarkers = {};

        const restaurants = await firestore.collection('Restaurants').get();

        const rest = restaurants.docs.map(r => ({
            ID: r.id,
            ...r.data()
        }))

        for (const restaurant in rest) {
            if (restaurant.terrace == terrace) {
                validateTerrace = true;
                if (controllerCity != '') {
                    if (restaurant.address
                        .toLowerCase()
                        .contains(controllerCity.toLowerCase())) {
                        validateCity = true;
                    } else {
                        validateCity = false;
                    }
                }
                if (controllerZone != '') {
                    if (restaurant.address
                        .toLowerCase()
                        .contains(controllerZone.text.toLowerCase())) {
                        validateZone = true;
                    } else {
                        validateZone = false;
                    }
                }
                if (categories.isNotEmpty) {
                    cateGories = [];
                    for (const categorySelected in categories) {
                        for (const category in restaurant.categories) {
                            if (categorySelected.name == category) {
                                cateGories.add(category);
                            }
                        }
                    }
                    if (cateGories.isNotEmpty) {
                        validateCategory = true;
                    } else {
                        validateCategory = false;
                    }
                }

                if (kilometres != 0) {
                    var distanceKm = 0;
                    var dlat = 0;
                    var dlng = 0;
                    var a = 0;
                    var c = 0;

                    for (const marker in markers) {
                        const lat1 = math.radians(location.latitude);
                        const lng1 = math.radians(location.longitude);
                        const lat2 = math.radians(marker.position.latitude);
                        const lng2 = math.radians(marker.position.longitude);

                        dlat = lat2 - lat1;
                        dlng = lng2 - lng1;
                        a = sin(dlat / 2) * sin(dlat / 2) +
                            cos(lat1) * cos(lat2) * (sin(dlng / 2)) * (sin(dlng / 2));
                        c = 2 * atan2(sqrt(a), sqrt(1 - a));

                        distanceKm = radiusEarth * c;
                        if (distanceKm <= kilometres) {
                            nearbyMarkers.add(marker);
                        }
                    }
                }

                if (nearbyMarkers.isNotEmpty) {
                    var markers = [];
                    for (var market in nearbyMarkers) {
                        if (market.markerId.value == restaurant.ID) {
                            markers.add(restaurant);
                        }
                    }
                    if (markers.isNotEmpty) {
                        validateNearbyMarkers = true;
                    } else {
                        validateNearbyMarkers = false;
                    }
                }
            } else {
                validateTerrace = false;
            }
            if (validateCity &&
                validateZone &&
                validateTerrace &&
                validateCategory &&
                validateNearbyMarkers) {
                var getProducts =
                    await firestore
                        .collection('Products')
                        .where('id_restaurant', isEqualTo(restaurant.ID))
                        .get();

                if (allergenicSelect.isNotEmpty) {
                    if (getProducts.isNotEmpty) {
                        for (var allergens in allergenicSelect) {
                            for (var product in getProducts) {
                                var select = product.allergens
                                    .where((aller) => aller.name != allergens.name);
                                if (select.isNotEmpty) {
                                    restaurant.searchProducts?.add(product);
                                    restaurantList.add(restaurant);
                                }
                            }
                        }
                    }
                } else if (getProducts.isNotEmpty) {
                    var product = getProducts
                        .where((prod) => prod.urlProduct != '' && prod.urlImage != '');
                    if (product.isNotEmpty) {
                        var list = [];
                        for (var prod in product) {
                            list.add(prod);
                        }
                        restaurant.searchProducts = list;
                        restaurantList.add(restaurant);
                    }
                }
                if (map) {
                    for (var marker in markers) {
                        if (restaurant.ID == marker.markerId.value) {
                            newMarkers.add(marker);
                        }
                    }
                }
                // kilometres = 0;
            }
        }

        var productList = [];
        for (var resta in restaurantList) {
            for (var prod in resta.searchProducts ?? []) {
                productList.add(prod);
            }
        }

        productList.forEach(doc => {
            const resInfo = doc.data();
            productList.push({
                id: resInfo.id,
                name: resInfo.name,
                restaurantId: resInfo.restaurantId,
                urlImage: resInfo.urlImage,
                urlProduct: resInfo.urlProduct,
            })
        })
        return productList;
    } catch (err) {
        console.error(err)
        return res.status(500).send(err)
    }
})


// const functions = require("firebase-functions");
// const admin = require('firebase-admin');
// const { transporter } = require("./utils/eTransporter");

// admin.initializeApp(functions.config().functions);

// var newData;
// var name;
// var id;
// var productName;

// exports.newRestaurantMessage = functions.firestore.document('Restaurants/{restaurantId}')
//     .onCreate(async (snapshot) => {
//         if (snapshot.empty) {
//             console.log('No devices');
//             return;
//         }

//         const topic = 'new-restaurant';
//         name = snapshot.data().name;
//         var payload = {
//             notification: {
//                 title: `${name}, ahora es parte de la familia.`,
//                 body: 'Tenemos un nuevo restaurante en Gourmeats',
//                 sound: 'default'
//             },
//             data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
//         };

//         try {
//             await admin.messaging().sendToTopic(topic, payload);
//             console.log('Notification sent');
//         } catch (error) {
//             console.log('Error');
//         }
//     });

// exports.newProductMessage = functions.firestore.document('Products/{productId}')
//     .onCreate(async (snapshot) => {
//         if (snapshot.empty) {
//             console.log('No devices');
//             return;
//         }
//         var restaurantName = [];
//         const topic = 'new-product';
//         newData = snapshot.data();
//         id = snapshot.data().id_restaurant;
//         productName = snapshot.data().name;

//         const restaurantsId = await admin.firestore().collection('Restaurants').get();

//         for (var restaurant of restaurantsId.docs) {
//             if (restaurant.data().ID == id) {
//                 restaurantName.push(restaurant.data().name)
//             }
//         }

//         var payload = {
//             notification: {
//                 title: `${restaurantName} añadió un nuevo producto.`,
//                 body: `${productName}`, sound: 'default'
//             },

//             data: {
//                 click_action: 'FLUTTER_NOTIFICATION_CLICK',
//             },
//         };

//         try {
//             await admin.messaging().sendToTopic(topic, payload);
//             console.log('Notification sent');
//         } catch (error) {
//             console.log('Error');
//         }
//     });

// // exports.sendDeletedConfirmEmail = functions.https.onRequest(async (request, response) => {

// //     const userEmail = request.body.userEmail;

// //     try {
// //         sendEmail(userEmail)
// //     } catch (e) {
// //         console.log("Error sending", e)
// //     }

// // })

// // const sendEmail = (email) => {
// //     try {
// //         const info = transporter.sendMail({
// //             from: "admin@gourmeatsapp.com",
// //             to: email,
// //             subject: "Cuenta de Gourmeats eliminada",
// //             html: `
// //             <body>
// //                 <p>A través de este correo estamos confirmando la eliminación de su cuenta.</p>
// //             </body>
// //             `
// //         });

// //         console.log("Message sent: %s", info.messageId)
// //         response.status(200).send('Email sent');
// //     } catch (e) {
// //         console.log("Error", e)
// //         response.status(500).send('Failed sending email');
// //     }
// // }

// // exports.deleteUserAuth = functions.https.onRequest(async (request, response) => {

// //     const uid = request.body.userId;

// //     admin.auth().deleteUser(uid)
// //         .then(() => {
// //             admin.firestore().collection('Users').doc(uid).delete();
// //             admin.firestore().collection('notifications').doc(uid).delete();

// //             console.log('Successfully deleted user');
// //             response.status(200).send('Deleted user');
// //         })
// //         .catch(error => {
// //             console.log('Error deleting user', error);
// //             response.status(500).send('Failed');
// //         })
// // })


// // exports.followUserMessage = functions.https.onRequest(async (request, response) => {
// //     const userEmail = request.body.userEmail;
// //     const userToken = request.body.userToken;
// //     const followerName = request.body.followerName;
// //     admin.auth().getUserByEmail(userEmail)
// //         .then(userRecord => {
// //             var payload = {
// //                 notification: {
// //                     title: `${followerName} te ha seguido`,
// //                     sound: 'default'
// //                 },
// //                 data: {
// //                     click_action: 'FLUTTER_NOTIFICATION_CLICK'
// //                 },
// //             };
// //             return admin.messaging().sendToDevice(userToken, payload);
// //         })
// //         .then(() => {
// //             console.log("Notification sent")
// //             response.status(200).send('Notification sent successfully')
// //             return
// //         })
// //         .catch(error => {
// //             console.log('Error sending notification', error)
// //             response.status(500).send(`Failed to send notification`)
// //         })
// // });

// const functions = require("firebase-functions");
// const admin = require('firebase-admin');
// const { transporter } = require("./utils/eTransporter");

// admin.initializeApp(functions.config().functions);

// var newData;
// var name;
// var id;
// var productName;

// exports.newRestaurantMessage = functions.firestore.document('Restaurants/{restaurantId}')
//     .onCreate(async (snapshot) => {
//         if (snapshot.empty) {
//             console.log('No devices');
//             return;
//         }

//         const topic = 'new-restaurant';
//         name = snapshot.data().name;
//         var payload = {
//             notification: {
//                 title: `${name}, ahora es parte de la familia.`,
//                 body: 'Tenemos un nuevo restaurante en Gourmeats',
//                 sound: 'default'
//             },
//             data: { click_action: 'FLUTTER_NOTIFICATION_CLICK' },
//         };

//         try {
//             await admin.messaging().sendToTopic(topic, payload);
//             console.log('Notification sent');
//         } catch (error) {
//             console.log('Error');
//         }
//     });

// exports.newProductMessage = functions.firestore.document('Products/{productId}')
//     .onCreate(async (snapshot) => {
//         if (snapshot.empty) {
//             console.log('No devices');
//             return;
//         }
//         var restaurantName = [];
//         const topic = 'new-product';
//         newData = snapshot.data();
//         id = snapshot.data().id_restaurant;
//         productName = snapshot.data().name;

//         const restaurantsId = await admin.firestore().collection('Restaurants').get();

//         for (var restaurant of restaurantsId.docs) {
//             if (restaurant.data().ID == id) {
//                 restaurantName.push(restaurant.data().name)
//             }
//         }

//         var payload = {
//             notification: {
//                 title: `${restaurantName} añadió un nuevo producto.`,
//                 body: `${productName}`, sound: 'default'
//             },

//             data: {
//                 click_action: 'FLUTTER_NOTIFICATION_CLICK',
//             },
//         };

//         try {
//             await admin.messaging().sendToTopic(topic, payload);
//             console.log('Notification sent');
//         } catch (error) {
//             console.log('Error');
//         }
//     });

// exports.sendDeletedConfirmEmail = functions.https.onRequest(async (request, response) => {

//     const userEmail = request.body.userEmail;

//     try {
//         sendEmail(userEmail)
//     } catch (e) {
//         console.log("Error sending", e)
//     }

// })

// const sendEmail = (email) => {
//     try {
//         const info = transporter.sendMail({
//             from: "admin@gourmeatsapp.com",
//             to: email,
//             subject: "Cuenta de Gourmeats eliminada",
//             html: `
//             <body>
//                 <p>A través de este correo estamos confirmando la eliminación de su cuenta.</p>
//             </body>
//             `
//         });

//         console.log("Message sent: %s", info.messageId)
//         response.status(200).send('Email sent');
//     } catch (e) {
//         console.log("Error", e)
//         response.status(500).send('Failed sending email');
//     }
// }

// exports.deleteUserAuth = functions.https.onRequest(async (request, response) => {

//     const uid = request.body.userId;

//     admin.auth().deleteUser(uid)
//         .then(() => {
//             admin.firestore().collection('Users').doc(uid).delete();
//             admin.firestore().collection('notifications').doc(uid).delete();

//             console.log('Successfully deleted user');
//             response.status(200).send('Deleted user');
//         })
//         .catch(error => {
//             console.log('Error deleting user', error);
//             response.status(500).send('Failed');
//         })
// })


// exports.followUserMessage = functions.https.onRequest(async (request, response) => {
//     const userEmail = request.body.userEmail;
//     const userToken = request.body.userToken;
//     const followerName = request.body.followerName;
//     admin.auth().getUserByEmail(userEmail)
//         .then(userRecord => {
//             var payload = {
//                 notification: {
//                     title: `${followerName} te ha seguido`,
//                     sound: 'default'
//                 },
//                 data: {
//                     click_action: 'FLUTTER_NOTIFICATION_CLICK'
//                 },
//             };
//             return admin.messaging().sendToDevice(userToken, payload);
//         })
//         .then(() => {
//             console.log("Notification sent")
//             response.status(200).send('Notification sent successfully')
//             return
//         })
//         .catch(error => {
//             console.log('Error sending notification', error)
//             response.status(500).send(`Failed to send notification`)
//         })
// });