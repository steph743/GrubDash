const path = require("path"); 

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// validation middleware
function bodyHasAllProperties(req, res, next) {
  const { data: { deliverTo, mobileNumber, dishes } = {} } = req.body;
  if (!deliverTo || !deliverTo.trim()) {
    next({
      status: 400,
      message: "Order must include a deliverTo"
    })
  }
  if (!mobileNumber || !mobileNumber.trim()) {
    next({
      status: 400,
      message: "Order must include a mobileNumber"
    })
  } 
  if (!dishes) {
    next({
      status: 400,
      message: "Order must include a dish"
    })
  }
  return next();
}

function dishesPropertyIsValid(req, res, next) {
  const { data: { dishes } } = req.body;
  if (!Array.isArray(dishes) || !dishes.length) {
    next({
      status: 400,
      message: "Order must include at least one dish"
    })
  }
  dishes.map((dish, index) => {
    let regex = /^[0-9]*$/g
    if (!dish.quantity || dish.quantity <= 0 || regex.test(dish.quantity) === false || typeof dish.quantity !== 'number' ) {
      next({
        status: 400,
        message: `Dish ${index} must have a quantity that is an integer greater than 0`
      })
    }
  })
  next();
}

function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find(order => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`
  })
}

function orderIdMatchesBodyId(req, res, next) {
  const { orderId } = req.params;
  const { data: { id } = {}} = req.body;
  if (!id) return next();
  if (orderId !== id) {
    next ({
      status: 400,
      message: `Order id does not match route id. Order: ${id}, Route: ${orderId}`
    })
  }
  next();
}

function statusPropertyValid(req, res, next) {
  const { data: { status } = {} } = req.body;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
  if (!status || !status.trim() || !validStatus.includes(status)) {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
    })
  }
  if (status === 'delivered') {
    return next({
      status: 400,
      message: "A delivered order cannot be changed"
    })
  }
  return next();
}

function statusPropertyPending(req, res, next) {
  const order = res.locals.order;
  if (order.status !== 'pending') {
    next ({
      status: 400,
      message: `An order cannot be deleted unless it is pending`      
    })
  }
  next();
}

// orders handlers
function list(req, res, next) {
  res.json({ data: orders });
}

function create(req, res) {
  const { data: { deliverTo, mobileNumber, dishes } } = req.body;
  const newOrder = {
    id: nextId(), // Increment last id then assign as the current ID
    deliverTo,
    mobileNumber,
    status: "pending",
    dishes
  }
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function update(req, res) {
  const order = res.locals.order;
  const { data: { deliverTo, mobileNumber, status, dishes } } = req.body;
  if (order.deliverTo !== deliverTo) {
    order.deliverTo = deliverTo;
  }
  if (order.mobileNumber !== mobileNumber) {
    order.mobileNumber = mobileNumber;
  }
  if (status.mobileNumber !== status) {
    status.mobileNumber = status;
  }
  if (order.dishes !== dishes) {
    order.dishes = dishes;
  }

  res.json({ data: order });

}

function destroy(req, res) {
  const order = res.locals.order;
  const index = orders.indexOf(order);
  orders.splice(index, 1);
  res.sendStatus(204);
}

module.exports = {
  list,
  create: [bodyHasAllProperties, dishesPropertyIsValid, create],
  read: [orderExists, read],
  update: [orderExists, bodyHasAllProperties, orderIdMatchesBodyId, dishesPropertyIsValid, statusPropertyValid, update],
  delete: [orderExists, statusPropertyPending, destroy]
}
