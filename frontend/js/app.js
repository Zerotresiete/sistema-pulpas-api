// ECUAPULP - Sistema de Control
const API_URL = window.location.origin;
let productosTerminados = [];  // Array de productos {id, nombre, codigo, precio}

console.log("✅ app.js cargado correctamente");

function mostrarAlerta(msg, tipo) {
    const alerta = document.getElementById('alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = msg;
    alerta.classList.remove('d-none');
    setTimeout(() => alerta.classList.add('d-none'), 3000);
}

// ========== PRODUCTOS ==========
async function cargarProductos() {
    console.log("Cargando productos...");
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const productos = data.productos || data;
        const tbody = document.getElementById('tabla-productos');
        if (!tbody) return;

        if (!productos.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos</span></span>';
            return;
        }

        let html = '';
        for (let p of productos) {
            const stockActual = p.stock_actual !== undefined ? p.stock_actual : 0;
            const stockMinimo = p.stock_minimo || 0;
            // Solo considerar alerta si stock_minimo > 0 y stock_actual <= stock_minimo
            const alerta = (stockMinimo > 0 && stockActual <= stockMinimo);
            const filaClass = alerta ? 'table-danger' : '';
            const nombreConAlerta = alerta ? `${p.nombre || '-'} ⚠️` : (p.nombre || '-');
            // Mostrar stock actual / mínimo, sin texto adicional
            const stockTexto = `${stockActual} / ${stockMinimo}`;

            html += `<tr>
                <td>${p.codigo || '-'}</td>
                <td>${nombreConAlerta}</td>
                <td>${p.tipo || '-'}</td>
                <td>${p.unidad_medida || '-'}</td>
                <td>${stockTexto}</td>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editarProducto(${p.id})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})">🗑️</button>
                </td>
            </tr>`;
        }
        tbody.innerHTML = html;
        document.getElementById('total-productos').innerText = productos.length;
    } catch (error) {
        console.error("Error:", error);
        document.getElementById('tabla-productos').innerHTML = '<tr><td colspan="6" class="text-danger">Error al cargar</span></span>';
    }
}

async function guardarProducto() {
    const producto = {
        codigo: document.getElementById('prodCodigo').value,
        nombre: document.getElementById('prodNombre').value,
        tipo: document.getElementById('prodTipo').value,
        unidad_medida: document.getElementById('prodUnidad').value,
        stock_minimo: parseFloat(document.getElementById('prodStockMin').value) || 0,
        precio: parseFloat(document.getElementById('prodPrecio').value) || 0
    };
    
    if (!producto.codigo || !producto.nombre) {
        mostrarAlerta('Código y nombre son requeridos', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/productos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto creado', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalProducto'));
            modal.hide();
            cargarProductos();
            // Limpiar formulario
            document.getElementById('prodCodigo').value = '';
            document.getElementById('prodNombre').value = '';
            document.getElementById('prodTipo').value = 'materia_prima';
            document.getElementById('prodUnidad').value = 'kg';
            document.getElementById('prodStockMin').value = '0';
            document.getElementById('prodPrecio').value = '0';
        } else {
            mostrarAlerta('Error al crear producto', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function editarProducto(id) {
    console.log("Editando producto ID:", id);
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`);
        const producto = await response.json();
        
        // Llenar el formulario de edición
        document.getElementById('editProdId').value = producto.id;
        document.getElementById('editProdCodigo').value = producto.codigo || '';
        document.getElementById('editProdNombre').value = producto.nombre || '';
        document.getElementById('editProdTipo').value = producto.tipo || 'materia_prima';
        document.getElementById('editProdUnidad').value = producto.unidad_medida || 'kg';
        document.getElementById('editProdStockMin').value = producto.stock_minimo || 0;
        document.getElementById('editProdPrecio').value = producto.precio || 0;
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalEditarProducto'));
        modal.show();
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error al cargar el producto", "danger");
    }
}

async function actualizarProducto() {
    const id = document.getElementById('editProdId').value;
    
    const producto = {
        codigo: document.getElementById('editProdCodigo').value,
        nombre: document.getElementById('editProdNombre').value,
        tipo: document.getElementById('editProdTipo').value,
        unidad_medida: document.getElementById('editProdUnidad').value,
        stock_minimo: parseFloat(document.getElementById('editProdStockMin').value) || 0,
        precio: parseFloat(document.getElementById('editProdPrecio').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto actualizado', 'success');
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarProducto'));
            modal.hide();
            cargarProductos();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al actualizar', 'danger');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function eliminarProducto(id) {
    if (!confirm(`¿Estás seguro de eliminar el producto ID ${id}?\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    console.log("Eliminando producto ID:", id);
    
    try {
        const response = await fetch(`${API_URL}/productos/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log("Respuesta del servidor:", data);
        
        if (response.ok) {
            mostrarAlerta('✅ Producto eliminado correctamente', 'success');
            // Recargar la tabla de productos
            await cargarProductos();
        } else {
            if (data.error && data.error.includes('referenced')) {
                mostrarAlerta('⚠️ No se puede eliminar: El producto está siendo usado en ventas o compras', 'warning');
            } else {
                mostrarAlerta(data.error || 'Error al eliminar', 'danger');
            }
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        mostrarAlerta('Error de conexión con el servidor', 'danger');
    }
}

// ========== VENTAS ==========
async function cargarVentas() {
    console.log("Cargando ventas...");
    try {
        const response = await fetch(`${API_URL}/ventas`);
        const ventas = await response.json();
        const tbody = document.getElementById('tabla-ventas');
        if (!tbody) return;
        
        if (!ventas.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay ventas</span></span>';
            return;
        }
        
                let html = '';
        for (let v of ventas) {
            const entregado = v.estado_entrega === 'entregado';
            const entregaIcono = entregado ? '✅' : `<button class="btn btn-sm btn-primary" onclick="entregarVenta(${v.id})">📦</button>`;
            const pagado = v.estado_pago === 'pagado';
            const pagoIcono = pagado ? '💰' : `<button class="btn btn-sm btn-success" onclick="marcarPagada(${v.id})">💵</button>`;
            
            html += `<tr>
                <td>${v.id}</span>
                <td>${v.fecha || '-'}</span>
                <td>${v.cliente || '-'}</span>
                <td>$${v.total || 0}</span>
                <td>${entregaIcono}</span>
                <td>${pagoIcono}</span>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})" title="Ver detalle">👁️</button>
                    ${(v.estado_entrega !== 'entregado' && v.estado_pago !== 'pagado') ? 
                        `<button class="btn btn-sm btn-warning" onclick="editarVenta(${v.id})" title="Editar venta">✏️</button>
                         <button class="btn btn-sm btn-danger" onclick="eliminarVenta(${v.id})" title="Eliminar venta">🗑️</button>` : 
                        ''
                    }
                </span>
            </tr>`;
        }
        tbody.innerHTML = html;
        
        const pendientes = ventas.filter(v => v.estado_pago !== 'pagado');
        document.getElementById('ventas-pendientes').innerText = pendientes.length;
        const totalCobrar = pendientes.reduce((s, v) => s + (v.total || 0), 0);
        document.getElementById('total-cobrar').innerText = `$${totalCobrar}`;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function marcarPagada(id) {
    if (!confirm(`¿Venta #${id} pagada?`)) return;
    try {
        const response = await fetch(`${API_URL}/ventas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado_pago: 'pagado' })
        });
        if (response.ok) {
            mostrarAlerta('✅ Venta pagada', 'success');
            cargarVentas();
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function guardarVenta() {
    console.log("Guardando venta...");
    const clienteId = document.getElementById('ventaCliente').value;
    if (!clienteId) {
        mostrarAlerta('Seleccione un cliente', 'warning');
        return;
    }
    
    const productos = [];
    let valido = true;
    
    document.querySelectorAll('.producto-item').forEach(item => {
        const productoId = item.querySelector('.producto-id').value;
        const cantidad = parseFloat(item.querySelector('.producto-cantidad').value);
        const precio = parseFloat(item.querySelector('.producto-precio').value);
        
        if (productoId && cantidad > 0 && precio > 0) {
            productos.push({
                producto_id: parseInt(productoId),
                cantidad: cantidad,
                precio_unitario: precio
            });
        } else if (productoId || cantidad || precio) {
            valido = false;
        }
    });
    
    if (!valido || productos.length === 0) {
        mostrarAlerta('Complete los productos correctamente', 'warning');
        return;
    }
    
    const venta = {
        cliente_id: parseInt(clienteId),
        fecha_venta: new Date().toISOString().split('T')[0],
        fecha_pactada_pago: document.getElementById('ventaFechaPago').value || null,
        observaciones: document.getElementById('ventaObservaciones').value || '',
                estado_pago: 'pendiente',
        estado_entrega: 'pendiente',
        productos: productos
    };

    try {
        const response = await fetch(`${API_URL}/ventas/detalle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(venta)
        });

        const data = await response.json();  // ← Obtener datos de la respuesta

        if (response.ok) {
            mostrarAlerta('✅ Venta guardada', 'success');

            // Mostrar alerta si hay productos con stock insuficiente
            if (data.faltantes && data.faltantes.length > 0) {
                let mensajeFaltantes = "⚠️ Atención: Los siguientes productos no tienen stock suficiente:\n";
                data.faltantes.forEach(f => {
                    mensajeFaltantes += `- ${f.producto}: solicitado ${f.solicitado}, disponible ${f.disponible}, faltante ${f.faltante}\n`;
                });
                mostrarAlerta(mensajeFaltantes, 'warning');
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById('modalVenta'));
            if (modal) modal.hide();
            cargarVentas();

            // Limpiar formulario
            document.getElementById('ventaCliente').value = '';
            document.getElementById('ventaFechaPago').value = '';
            document.getElementById('ventaObservaciones').value = '';
            document.getElementById('contenedor-productos').innerHTML = `
                <div class="row mb-2 producto-item">
                    <div class="col-md-5"><select class="form-control producto-select"><option>Seleccionar producto...</option></select></div>
                    <div class="col-md-3"><input type="number" step="0.1" class="form-control producto-cantidad" placeholder="Cantidad"></div>
                    <div class="col-md-3"><input type="number" step="0.01" class="form-control producto-precio" placeholder="Precio"></div>
                    <div class="col-md-1"><button class="btn btn-danger btn-sm eliminar-producto" style="display:none">✖</button></div>
                </div>
            `;
        } else {
            mostrarAlerta(data.error || 'Error al guardar', 'danger');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function entregarVenta(id) {
    if (!confirm(`¿Confirmar entrega de la venta #${id}?`)) return;

    try {
        const response = await fetch(`${API_URL}/ventas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado_entrega: 'entregado' })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarAlerta(`✅ Venta #${id} entregada y stock actualizado`, 'success');
            cargarVentas();      // Recargar la tabla de ventas
            cargarProductos();   // Recargar la tabla de productos para ver stock actualizado
        } else {
            // Si hay detalles de faltantes, mostrarlos
            if (data.faltantes && data.faltantes.length > 0) {
                let mensaje = "❌ No se puede entregar por falta de stock:\n";
                data.faltantes.forEach(f => {
                    mensaje += `- ${f.producto}: disponible ${f.disponible}, necesario ${f.necesario}, faltante ${f.faltante}\n`;
                });
                mostrarAlerta(mensaje, 'danger');
            } else {
                mostrarAlerta(data.error || 'Error al entregar la venta', 'danger');
            }
        }
    } catch (error) {
        console.error("Error en entregarVenta:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function marcarPagada(id) {
    if (!confirm(`¿Pagar venta #${id}?`)) return;
    
    const res = await fetch(`${API_URL}/ventas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado_pago: 'pagado' })
    });
    
    if (res.ok) {
        mostrarAlerta(`✅ Venta #${id} pagada`, 'success');
        // Actualizar SOLO el ícono, sin recargar toda la tabla
        const filas = document.querySelectorAll('#tabla-ventas tr');
        for (let fila of filas) {
            const idCelda = fila.cells[0];
            if (idCelda && idCelda.innerText == id) {
                fila.cells[5].innerHTML = '💰';
                break;
            }
        }
        // NO llamar a cargarVentas()
    }
}

// ==================== BUSCADOR DE PRODUCTOS EN VENTAS ====================

async function cargarListaProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        let productos = data.productos || data;
        // Filtrar productos terminados y ordenar alfabéticamente
        productosTerminados = productos
            .filter(p => p.tipo === 'producto_terminado')
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
        
        const datalist = document.getElementById('listaProductos');
        if (datalist) {
            datalist.innerHTML = '';
            productosTerminados.forEach(p => {
                const option = document.createElement('option');
                option.value = p.nombre;
                option.setAttribute('data-id', p.id);
                option.setAttribute('data-precio', p.precio || 0);
                datalist.appendChild(option);
            });
        }
        console.log(`✅ ${productosTerminados.length} productos terminados cargados para búsqueda`);
    } catch (error) {
        console.error("Error cargando lista de productos:", error);
    }
}

function inicializarFilaProducto(fila) {
    const inputBuscar = fila.querySelector('.producto-buscar');
    const inputId = fila.querySelector('.producto-id');
    const inputPrecio = fila.querySelector('.producto-precio');
    const inputCantidad = fila.querySelector('.producto-cantidad');
    const btnEliminar = fila.querySelector('.eliminar-producto');

    if (!inputBuscar) return;

    // Evento al seleccionar una opción del datalist (change)
    inputBuscar.addEventListener('change', function() {
        const nombreSeleccionado = this.value;
        const producto = productosTerminados.find(p => p.nombre === nombreSeleccionado);
        if (producto) {
            inputId.value = producto.id;
            inputPrecio.value = producto.precio || 0;
            calcularTotalVenta();
        } else {
            inputId.value = '';
            inputPrecio.value = '';
        }
    });

    // Evento al escribir (input) para limpiar si no coincide
    inputBuscar.addEventListener('input', function() {
        if (!productosTerminados.some(p => p.nombre === this.value)) {
            inputId.value = '';
            inputPrecio.value = '';
        }
        calcularTotalVenta();
    });

    if (inputCantidad) inputCantidad.addEventListener('input', calcularTotalVenta);
    if (inputPrecio) inputPrecio.addEventListener('input', calcularTotalVenta);

    if (btnEliminar) {
        btnEliminar.addEventListener('click', function() {
            fila.remove();
            calcularTotalVenta();
        });
    }
}

async function prepararModalVenta() {
    await cargarListaProductos();
    const primeraFila = document.querySelector('.producto-item');
    if (primeraFila) inicializarFilaProducto(primeraFila);
}

// ========== VER DETALLE DE VENTA ==========

async function verDetalleVenta(id) {
    console.log("Ver detalle venta ID:", id);
    
    try {
        const response = await fetch(`${API_URL}/ventas/${id}/detalle`);
        
        if (!response.ok) {
            mostrarAlerta("Error al cargar detalle", "danger");
            return;
        }
        
        const data = await response.json();
        console.log("Datos recibidos:", data);
        
        const venta = data.venta;
        const detalles = data.detalles;
        
        let mensaje = `📋 VENTA #${id}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `Cliente: ${venta.cliente?.nombre || 'N/A'}\n`;
        mensaje += `Fecha: ${venta.fecha_venta || '-'}\n`;
        mensaje += `Entrega: ${venta.estado_entrega === 'entregado' ? '✅ Entregado' : '📦 Pendiente'}\n`;
        mensaje += `Pago: ${venta.estado_pago === 'pagado' ? '💰 Pagado' : '⏰ Por pagar'}\n`;
        mensaje += `Total: $${venta.total || 0}\n`;
        
        if (venta.fecha_pactada_pago) {
            mensaje += `Fecha pactada: ${venta.fecha_pactada_pago}\n`;
        }
        
        if (venta.observaciones) {
            mensaje += `Observaciones: ${venta.observaciones}\n`;
        }
        
        mensaje += `\n🛒 PRODUCTOS:\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (detalles && detalles.length > 0) {
            detalles.forEach((d, i) => {
                mensaje += `${i + 1}. ${d.producto?.nombre || 'Producto'}\n`;
                mensaje += `   Cantidad: ${d.cantidad} ${d.producto?.unidad_medida || 'unid'}\n`;
                mensaje += `   Precio: $${d.precio_unitario}\n`;
                mensaje += `   Subtotal: $${d.subtotal}\n\n`;
            });
        } else {
            mensaje += `   No hay productos registrados\n`;
        }
        
        alert(mensaje);
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error al cargar detalle", "danger");
    }
}
// ========== SELECTORES PARA VENTAS ==========

async function cargarClientesSelector() {
    console.log("Cargando clientes para selector...");
    try {
        const response = await fetch(`${API_URL}/terceros`);
        const data = await response.json();
        const terceros = data.terceros || data;
        // Filtrar clientes y ambos
        const clientes = terceros.filter(t => t.tipo === 'cliente' || t.tipo === 'ambos');
        const select = document.getElementById('ventaCliente');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione un cliente...</option>';
        clientes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
        console.log(`✅ ${clientes.length} clientes cargados`);
    } catch (error) {
        console.error("Error cargando clientes:", error);
    }
}

async function cargarProductosVentaSelector() {
    console.log("Cargando productos terminados...");
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const productos = data.productos || data;
        // Filtrar solo productos terminados
        const terminados = productos.filter(p => p.tipo === 'producto_terminado');
        
        const selects = document.querySelectorAll('.producto-select');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar producto...</option>';
            terminados.forEach(p => {
                select.innerHTML += `<option value="${p.id}" data-precio="${p.precio || 0}">${p.nombre} (${p.codigo})</option>`;
            });
        });
        console.log(`✅ ${terminados.length} productos terminados cargados`);
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

// Actualizar precio automáticamente al seleccionar producto
function setupProductoPrecioAuto() {
    document.querySelectorAll('.producto-select').forEach(select => {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const precio = selectedOption.getAttribute('data-precio') || 0;
            const row = this.closest('.producto-item');
            const precioInput = row.querySelector('.producto-precio');
            if (precioInput) {
                precioInput.value = precio;
                calcularTotalVenta();
            }
        });
    });
}

// Calcular total de venta con decimales
function calcularTotalVenta() {
    let total = 0;
    document.querySelectorAll('.producto-item').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.producto-cantidad').value) || 0;
        const precio = parseFloat(item.querySelector('.producto-precio').value) || 0;
        total += cantidad * precio;
    });
    const totalSpan = document.getElementById('ventaTotal');
    if (totalSpan) totalSpan.textContent = total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return total;
}

// Agregar nueva fila de producto
function agregarFilaProducto() {
    const contenedor = document.getElementById('contenedor-productos');
    const plantilla = document.querySelector('.producto-item');
    if (!plantilla) return;
    
    const nuevaFila = plantilla.cloneNode(true);
    
    // Limpiar valores de la nueva fila
    const inputBuscar = nuevaFila.querySelector('.producto-buscar');
    const inputId = nuevaFila.querySelector('.producto-id');
    const inputCantidad = nuevaFila.querySelector('.producto-cantidad');
    const inputPrecio = nuevaFila.querySelector('.producto-precio');
    const btnEliminar = nuevaFila.querySelector('.eliminar-producto');
    
    if (inputBuscar) inputBuscar.value = '';
    if (inputId) inputId.value = '';
    if (inputCantidad) inputCantidad.value = '';
    if (inputPrecio) inputPrecio.value = '';
    
    // Mostrar botón eliminar
    if (btnEliminar) {
        btnEliminar.style.display = 'block';
        // Usar onclick como en tu versión antigua
        btnEliminar.onclick = function() {
            nuevaFila.remove();
            calcularTotalVenta();
        };
    }
    
    // Configurar eventos para la nueva fila (similar a la versión antigua pero con input de búsqueda)
    inicializarFilaProducto(nuevaFila);
    
    contenedor.appendChild(nuevaFila);
}

function inicializarFilaProducto(fila) {
    const inputBuscar = fila.querySelector('.producto-buscar');
    const inputId = fila.querySelector('.producto-id');
    const inputCantidad = fila.querySelector('.producto-cantidad');
    const inputPrecio = fila.querySelector('.producto-precio');
    const btnEliminar = fila.querySelector('.eliminar-producto');
    
    if (!inputBuscar) return;
    
    // Evento cuando se selecciona un producto del datalist (change)
    inputBuscar.addEventListener('change', function() {
        const nombreSeleccionado = this.value;
        const producto = productosTerminados.find(p => p.nombre === nombreSeleccionado);
        if (producto) {
            inputId.value = producto.id;
            inputPrecio.value = producto.precio || 0;
            calcularTotalVenta();
        } else {
            inputId.value = '';
            inputPrecio.value = '';
        }
    });
    
    // Evento mientras escribe (input) para limpiar si no hay coincidencia
    inputBuscar.addEventListener('input', function() {
        if (!productosTerminados.some(p => p.nombre === this.value)) {
            inputId.value = '';
            inputPrecio.value = '';
        }
        calcularTotalVenta();
    });
    
    // Eventos para cantidad y precio (como en la versión antigua)
    if (inputCantidad) inputCantidad.addEventListener('input', calcularTotalVenta);
    if (inputPrecio) inputPrecio.addEventListener('input', calcularTotalVenta);
    
    // Botón eliminar (por si la fila es la primera y no se clonó con onclick)
    if (btnEliminar && !btnEliminar.onclick) {
        btnEliminar.onclick = function() {
            fila.remove();
            calcularTotalVenta();
        };
    }
}

async function cargarProductosEnSelect(selectElement) {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const productos = data.productos || data;
        const terminados = productos.filter(p => p.tipo === 'producto_terminado');
        
        selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';
        terminados.forEach(p => {
            selectElement.innerHTML += `<option value="${p.id}" data-precio="${p.precio || 0}">${p.nombre} (${p.codigo})</option>`;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}
// ========== TERCEROS COMPLETO ==========

async function guardarTercero() {
    const id = document.getElementById('terceroId').value;
    const tercero = {
        nombre: document.getElementById('terceroNombre').value,
        telefono: document.getElementById('terceroTelefono').value || '',
        email: document.getElementById('terceroEmail').value || '',
        forma_pago: document.getElementById('terceroFormaPago').value || '',
        tipo: document.getElementById('terceroTipo').value
    };
    
    if (!tercero.nombre) {
        mostrarAlerta('El nombre es requerido', 'warning');
        return;
    }
    
    try {
        let url = `${API_URL}/terceros`;
        let method = 'POST';
        let mensaje = '✅ Tercero creado';
        
        if (id) {
            url = `${API_URL}/terceros/${id}`;
            method = 'PUT';
            mensaje = '✅ Tercero actualizado';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tercero)
        });
        
        if (response.ok) {
            mostrarAlerta(mensaje, 'success');
            
            // Limpiar formulario
            document.getElementById('terceroId').value = '';
            document.getElementById('terceroNombre').value = '';
            document.getElementById('terceroTelefono').value = '';
            document.getElementById('terceroEmail').value = '';
            document.getElementById('terceroFormaPago').value = '';
            document.getElementById('terceroTipo').value = 'cliente';
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalTercero'));
            if (modal) modal.hide();
            
            // Recargar tabla
            cargarTerceros();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al guardar', 'danger');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function editarTercero(id) {
    console.log("Editando tercero ID:", id);
    
    try {
        const response = await fetch(`${API_URL}/terceros/${id}`);
        const tercero = await response.json();
        
        // Cambiar título del modal
        document.getElementById('modalTerceroTitle').innerHTML = '<i class="fas fa-edit me-2"></i>Editar Tercero';
        
        // Llenar formulario
        document.getElementById('terceroId').value = tercero.id;
        document.getElementById('terceroNombre').value = tercero.nombre || '';
        document.getElementById('terceroTelefono').value = tercero.telefono || '';
        document.getElementById('terceroEmail').value = tercero.email || '';
        document.getElementById('terceroFormaPago').value = tercero.forma_pago || '';
        document.getElementById('terceroTipo').value = tercero.tipo || 'cliente';
        
        // Abrir modal
        const modal = new bootstrap.Modal(document.getElementById('modalTercero'));
        modal.show();
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error al cargar el tercero", "danger");
    }
}

async function eliminarTercero(id) {
    if (!confirm(`¿Estás seguro de eliminar este registro?\nEsta acción no se puede deshacer.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/terceros/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (response.ok) {
            mostrarAlerta('✅ Registro eliminado', 'success');
            cargarTerceros();
        } else {
            if (data.error && (data.error.includes('ventas') || data.error.includes('compras'))) {
                mostrarAlerta('⚠️ No se puede eliminar: Tiene ventas o compras asociadas', 'warning');
            } else {
                mostrarAlerta(data.error || 'Error al eliminar', 'danger');
            }
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// Resetear modal cuando se abre para nuevo registro
document.getElementById('modalTercero')?.addEventListener('show.bs.modal', function(e) {
    if (!document.getElementById('terceroId').value) {
        document.getElementById('modalTerceroTitle').innerHTML = '<i class="fas fa-user-plus me-2"></i>Nuevo Tercero';
        document.getElementById('terceroId').value = '';
        document.getElementById('terceroNombre').value = '';
        document.getElementById('terceroTelefono').value = '';
        document.getElementById('terceroEmail').value = '';
        document.getElementById('terceroFormaPago').value = '';
        document.getElementById('terceroTipo').value = 'cliente';
    }
});
async function cargarTerceros() {
    console.log("Cargando terceros...");
    try {
        const response = await fetch(`${API_URL}/terceros`);
        const data = await response.json();
        const terceros = data.terceros || data;
        const tbody = document.getElementById('tabla-terceros');
        if (!tbody) return;
        
        if (!terceros.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Sin registros</span></span>';
            return;
        }
        
        let html = '';
        for (let t of terceros) {
            // Colores según tipo
            let colorClass = '';
            let icono = '';
            if (t.tipo === 'cliente') {
                colorClass = 'success';
                icono = '👤';
            } else if (t.tipo === 'proveedor') {
                colorClass = 'info';
                icono = '🚚';
            } else {
                colorClass = 'secondary';
                icono = '🔄';
            }
            
            html += `<tr>
                <td>${icono} ${t.nombre}</span>
                <td>${t.telefono || '-'}</span>
                <td>${t.email || '-'}</span>
                <td><span class="badge bg-${colorClass}">${t.tipo}</span></span>
                <td>
                    <button class="btn btn-sm btn-warning" onclick="editarTercero(${t.id})" title="Editar">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarTercero(${t.id})" title="Eliminar">🗑️</button>
                </span>
            </table>`;
        }
        tbody.innerHTML = html;
    } catch (error) {
        console.error("Error:", error);
    }
}
// ========== COMPRAS ==========

async function recibirCompra(id) {
    if (!confirm(`¿Recibir compra #${id}?`)) return;
    try {
        const response = await fetch(`${API_URL}/compras/${id}/recibir`, { method: 'PUT' });
        if (response.ok) {
            mostrarAlerta('✅ Compra recibida', 'success');
            cargarCompras();
            cargarProductos();
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}



// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Inicializando sistema...");
    cargarProductos();
    cargarVentas();
    cargarTerceros();
    cargarCompras();

document.getElementById('editAgregarProducto')?.addEventListener('click', () => {
    const container = document.getElementById('editContenedorProductos');
    agregarFilaEdicion(container, null);
});

    // ===== NUEVO: BUSCADOR DE PRODUCTOS =====
    const buscadorProductos = document.getElementById('buscadorProductos');
    if (buscadorProductos) {
        buscadorProductos.addEventListener('keyup', function() {
            const texto = this.value.toLowerCase();
            const filas = document.querySelectorAll('#tabla-productos tr');
            filas.forEach(fila => {
                if (fila.cells.length === 0) return; // saltar filas vacías o encabezados
                const codigo = (fila.cells[0]?.innerText || '').toLowerCase();
                const nombre = (fila.cells[1]?.innerText || '').toLowerCase();
                const coincide = codigo.includes(texto) || nombre.includes(texto);
                fila.style.display = coincide ? '' : 'none';
            });
        });
        console.log("✅ Buscador de productos activado");
    }
    // ===== FIN BUSCADOR =====
});


// ========== INICIALIZACIÓN DE EVENTOS DE VENTAS ==========

// Cuando se abre el modal de venta
document.getElementById('modalVenta')?.addEventListener('show.bs.modal', async function() {
    console.log("Modal de venta abierto");
    await cargarListaProductos();               // Cargar productos para el datalist
    await cargarClientesSelector();             // Cargar clientes (si existe)
    
    // Inicializar la primera fila (si aún no tiene eventos)
    const primeraFila = document.querySelector('.producto-item');
    if (primeraFila) inicializarFilaProducto(primeraFila);
});

// Botón para agregar otro producto
document.getElementById('agregarProducto')?.addEventListener('click', agregarFilaProducto);


// ========== COMPRAS COMPLETO ==========

async function cargarCompras() {
    console.log("Cargando compras...");
    try {
        const response = await fetch(`${API_URL}/compras`);
        const compras = await response.json();
        const tbody = document.getElementById('tabla-compras');
        if (!tbody) return;
        
        if (!compras.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay compras</span></span>';
            return;
        }
        
        let html = '';
        for (let c of compras) {
            let estadoIcono = c.estado === 'recibida' ? '✅' : '📦';
            let estadoColor = c.estado === 'recibida' ? 'success' : 'warning';
            
            html += `<tr>
                <td>${c.id}</span>
                <td>${c.fecha_compra || '-'}</span>
                <td>${c.proveedor_nombre || c.proveedor?.nombre || '-'}</span>
                <td>$${c.total || 0}</span>
                <td><span class="badge bg-${estadoColor}">${estadoIcono} ${c.estado || 'pendiente'}</span></span>
                <td>
                    <button class="btn btn-sm btn-info" onclick="verDetalleCompra(${c.id})" title="Ver detalle">👁️</button>
                    ${c.estado !== 'recibida' ? 
                        `<button class="btn btn-sm btn-primary" onclick="recibirCompra(${c.id})" title="Marcar como recibida">📦 Recibir</button>` : 
                        '<span class="text-success ms-2">✓ Recibida</span>'
                    }
                </span>
            </tr>`;
        }
        tbody.innerHTML = html;
    } catch (error) {
        console.error("Error:", error);
    }
}

async function guardarCompra() {
    console.log("Guardando compra...");
    
    const proveedorId = document.getElementById('compraProveedor').value;
    if (!proveedorId) {
        mostrarAlerta('Seleccione un proveedor', 'warning');
        return;
    }
    
    const productos = [];
    let valido = true;
    
    const items = document.querySelectorAll('.producto-compra-item');
    console.log("Items encontrados:", items.length);
    
    items.forEach(item => {
        const productoId = item.querySelector('.producto-select-compra').value;
        const cantidad = parseFloat(item.querySelector('.producto-cantidad-compra').value);
        const precio = parseFloat(item.querySelector('.producto-precio-compra').value);
        
        console.log("Producto:", productoId, "Cantidad:", cantidad, "Precio:", precio);
        
        if (productoId && cantidad > 0 && precio > 0) {
            productos.push({
                producto_id: parseInt(productoId),
                cantidad: cantidad,
                precio_unitario: precio
            });
        } else if (productoId || cantidad || precio) {
            valido = false;
        }
    });
    
    if (!valido || productos.length === 0) {
        mostrarAlerta('Complete los productos correctamente', 'warning');
        return;
    }
    
    const compra = {
        proveedor_id: parseInt(proveedorId),
        fecha_compra: document.getElementById('compraFecha').value || new Date().toISOString().split('T')[0],
        observaciones: document.getElementById('compraObservaciones').value || '',
        productos: productos
    };
    
    console.log("Enviando compra:", compra);
    
    try {
        const response = await fetch(`${API_URL}/compras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(compra)
        });
        
        const data = await response.json();
        console.log("Respuesta:", data);
        
        if (response.ok) {
            mostrarAlerta('✅ Compra guardada', 'success');
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalCompra'));
            if (modal) modal.hide();
            
            // Recargar la tabla
            await cargarCompras();
            
            // Limpiar formulario para la próxima vez
            document.getElementById('compraProveedor').value = '';
            document.getElementById('compraFecha').value = '';
            document.getElementById('compraObservaciones').value = '';
            
            // Resetear contenedor de productos
            const contenedor = document.getElementById('contenedor-productos-compra');
            if (contenedor) {
                contenedor.innerHTML = `
                    <div class="row mb-2 producto-compra-item">
                        <div class="col-md-5"><select class="form-control producto-select-compra"><option>Seleccionar producto...</option></select></div>
                        <div class="col-md-3"><input type="number" step="0.1" class="form-control producto-cantidad-compra" placeholder="Cantidad"></div>
                        <div class="col-md-3"><input type="number" step="0.01" class="form-control producto-precio-compra" placeholder="Precio unit."></div>
                        <div class="col-md-1"><button class="btn btn-danger btn-sm eliminar-producto-compra" style="display:none">✖</button></div>
                    </div>
                `;
            }
        } else {
            mostrarAlerta(data.error || 'Error al guardar', 'danger');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}


async function recibirCompra(id) {
    if (!confirm(`¿Confirmar recepción de la compra #${id}?\nSe actualizará el stock automáticamente.`)) return;
    
    try {
        const response = await fetch(`${API_URL}/compras/${id}/recibir`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            mostrarAlerta(`✅ Compra #${id} recibida y stock actualizado`, 'success');
            cargarCompras();
            cargarProductos(); // Actualizar tabla de productos
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al recibir', 'danger');
        }
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function verDetalleCompra(id) {
    console.log("Ver detalle compra ID:", id);
    
    try {
        const response = await fetch(`${API_URL}/compras/${id}`);
        const data = await response.json();
        console.log("Datos recibidos:", data);
        
        // La respuesta puede venir como { compra: {...}, detalles: [...] } o directamente
        const compra = data.compra || data;
        const detalles = data.detalles || [];
        
        let mensaje = `📋 COMPRA #${id}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `Proveedor: ${compra.proveedor?.nombre || compra.proveedor_nombre || 'N/A'}\n`;
        mensaje += `Fecha: ${compra.fecha_compra || '-'}\n`;
        mensaje += `Estado: ${compra.estado === 'recibida' ? '✅ Recibida' : '📦 Pendiente'}\n`;
        mensaje += `Total: $${compra.total || 0}\n\n`;
        mensaje += `PRODUCTOS:\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (detalles && detalles.length > 0) {
            detalles.forEach((d, i) => {
                const productoNombre = d.producto?.nombre || d.nombre || 'Producto';
                const cantidad = d.cantidad || 0;
                const precio = d.precio_unitario || 0;
                const subtotal = d.subtotal || (cantidad * precio);
                mensaje += `${i + 1}. ${productoNombre}\n`;
                mensaje += `   Cantidad: ${cantidad}\n`;
                mensaje += `   Precio: $${precio}\n`;
                mensaje += `   Subtotal: $${subtotal}\n\n`;
            });
        } else {
            mensaje += `   No hay productos registrados\n`;
        }
        
        alert(mensaje);
    } catch (error) {
        console.error("Error:", error);
        mostrarAlerta("Error al cargar detalle", "danger");
    }
}

// ========== SELECTORES PARA COMPRAS ==========

async function cargarProveedoresSelector() {
    console.log("Cargando proveedores...");
    try {
        const response = await fetch(`${API_URL}/terceros`);
        const data = await response.json();
        const terceros = data.terceros || data;
        // Filtrar proveedores y "ambos"
        const proveedores = terceros.filter(t => t.tipo === 'proveedor' || t.tipo === 'ambos');
        const select = document.getElementById('compraProveedor');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccione un proveedor...</option>';
        proveedores.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
        console.log(`✅ ${proveedores.length} proveedores cargados`);
    } catch (error) {
        console.error("Error cargando proveedores:", error);
    }
}

async function cargarProductosCompraSelector() {
    console.log("Cargando productos para compras...");
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const productos = data.productos || data;
        // Filtrar materia prima e insumos (para compras)
        const comprables = productos.filter(p => p.tipo === 'materia_prima' || p.tipo === 'insumo');
        
        const selects = document.querySelectorAll('.producto-select-compra');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccionar producto...</option>';
            comprables.forEach(p => {
                select.innerHTML += `<option value="${p.id}" data-precio="${p.precio || 0}">${p.nombre} (${p.codigo})</option>`;
            });
        });
        console.log(`✅ ${comprables.length} productos cargados para compras`);
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

function setupCompraPrecioAuto() {
    document.querySelectorAll('.producto-select-compra').forEach(select => {
        select.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const precio = selectedOption.getAttribute('data-precio') || 0;
            const row = this.closest('.producto-compra-item');
            const precioInput = row.querySelector('.producto-precio-compra');
            if (precioInput) {
                precioInput.value = precio;
                calcularTotalCompra();
            }
        });
    });
}

function calcularTotalCompra() {
    let total = 0;
    document.querySelectorAll('.producto-compra-item').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.producto-cantidad-compra').value) || 0;
        const precio = parseFloat(item.querySelector('.producto-precio-compra').value) || 0;
        total += cantidad * precio;
    });
    const totalSpan = document.getElementById('compraTotal');
    if (totalSpan) totalSpan.textContent = total.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return total;
}

function agregarFilaCompra() {
    const contenedor = document.getElementById('contenedor-productos-compra');
    const plantilla = document.querySelector('.producto-compra-item');
    if (!plantilla) return;
    
    const nuevaFila = plantilla.cloneNode(true);
    nuevaFila.querySelector('.producto-select-compra').value = '';
    nuevaFila.querySelector('.producto-cantidad-compra').value = '';
    nuevaFila.querySelector('.producto-precio-compra').value = '';
    nuevaFila.querySelector('.eliminar-producto-compra').style.display = 'block';
    
    nuevaFila.querySelector('.eliminar-producto-compra').onclick = function() {
        nuevaFila.remove();
        calcularTotalCompra();
    };
    
    const select = nuevaFila.querySelector('.producto-select-compra');
    select.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        const precio = selectedOption.getAttribute('data-precio') || 0;
        const row = this.closest('.producto-compra-item');
        row.querySelector('.producto-precio-compra').value = precio;
        calcularTotalCompra();
    });
    
    nuevaFila.querySelector('.producto-cantidad-compra').addEventListener('input', calcularTotalCompra);
    nuevaFila.querySelector('.producto-precio-compra').addEventListener('input', calcularTotalCompra);
    
    // Cargar productos en el nuevo select
    cargarProductosEnSelectCompra(select);
    
    contenedor.appendChild(nuevaFila);
}

async function cargarClientesEnSelector(selectId, clienteSeleccionado = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const response = await fetch(`${API_URL}/terceros?tipo=cliente`);
    const data = await response.json();
    const clientes = data.terceros || data;
    select.innerHTML = '<option value="">Seleccione un cliente...</option>';
    clientes.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        option.textContent = c.nombre;
        if (clienteSeleccionado == c.id) option.selected = true;
        select.appendChild(option);
    });
}

async function cargarListaProductosEditar() {
    if (productosTerminados.length === 0) {
        await cargarListaProductos(); // usa la existente
    }
    const datalist = document.getElementById('listaProductosEditar');
    if (!datalist) {
        const newDatalist = document.createElement('datalist');
        newDatalist.id = 'listaProductosEditar';
        document.body.appendChild(newDatalist);
    }
    const list = document.getElementById('listaProductosEditar');
    list.innerHTML = '';
    productosTerminados.forEach(p => {
        const option = document.createElement('option');
        option.value = p.nombre;
        list.appendChild(option);
    });
}

function calcularTotalEdicion() {
    let total = 0;
    document.querySelectorAll('#editContenedorProductos .producto-editar-item').forEach(fila => {
        const cantidad = parseFloat(fila.querySelector('.producto-cantidad-editar').value) || 0;
        const precio = parseFloat(fila.querySelector('.producto-precio-editar').value) || 0;
        total += cantidad * precio;
    });
    document.getElementById('editVentaTotal').innerText = total.toLocaleString('es-EC');
}

async function editarVenta(id) {
    try {
        const response = await fetch(`${API_URL}/ventas/${id}/detalle`);
        const data = await response.json();
        const venta = data.venta;
        const detalles = data.detalles;

        await cargarClientesEnSelector('editVentaCliente', venta.cliente_id);
        document.getElementById('editVentaId').value = venta.id;
        document.getElementById('editVentaFechaPago').value = venta.fecha_pactada_pago || '';
        document.getElementById('editVentaObservaciones').value = venta.observaciones || '';

        const container = document.getElementById('editContenedorProductos');
        container.innerHTML = '';
        if (detalles.length === 0) {
            agregarFilaEdicion(container, null);
        } else {
            detalles.forEach(det => agregarFilaEdicion(container, det));
        }
        calcularTotalEdicion();

        await cargarListaProductosEditar();
        new bootstrap.Modal(document.getElementById('modalEditarVenta')).show();
    } catch (error) {
        console.error(error);
        mostrarAlerta('Error al cargar la venta', 'danger');
    }
}



async function guardarEdicionVenta() {
    const id = document.getElementById('editVentaId').value;
    const cliente_id = document.getElementById('editVentaCliente').value;
    if (!cliente_id) {
        mostrarAlerta('Seleccione un cliente', 'warning');
        return;
    }
    const productos = [];
    let valido = true;
    document.querySelectorAll('#editContenedorProductos .producto-editar-item').forEach(fila => {
        const productoId = fila.querySelector('.producto-id-editar').value;
        const cantidad = parseFloat(fila.querySelector('.producto-cantidad-editar').value);
        const precio = parseFloat(fila.querySelector('.producto-precio-editar').value);
        if (productoId && cantidad > 0 && precio > 0) {
            productos.push({ producto_id: parseInt(productoId), cantidad, precio_unitario: precio });
        } else if (productoId || cantidad || precio) {
            valido = false;
        }
    });
    if (!valido || productos.length === 0) {
        mostrarAlerta('Complete correctamente los productos', 'warning');
        return;
    }

    const data = {
        cliente_id: parseInt(cliente_id),
        fecha_pactada_pago: document.getElementById('editVentaFechaPago').value || null,
        observaciones: document.getElementById('editVentaObservaciones').value,
        productos
    };

    try {
        const response = await fetch(`${API_URL}/ventas/${id}/editar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            mostrarAlerta('✅ Venta actualizada', 'success');
            bootstrap.Modal.getInstance(document.getElementById('modalEditarVenta')).hide();
            cargarVentas();
        } else {
            mostrarAlerta(result.error || 'Error al actualizar', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

function calcularTotalEdicion() {
    let total = 0;
    document.querySelectorAll('#editContenedorProductos .producto-editar-item').forEach(fila => {
        const cantidad = parseFloat(fila.querySelector('.producto-cantidad-editar').value) || 0;
        const precio = parseFloat(fila.querySelector('.producto-precio-editar').value) || 0;
        total += cantidad * precio;
    });
    document.getElementById('editVentaTotal').innerText = total.toLocaleString('es-EC');
}



function agregarFilaEdicion(contenedor, detalle = null) {
    const filaId = 'fila_' + Date.now() + '_' + Math.random();
    const html = `
        <div class="row mb-2 producto-editar-item" id="${filaId}">
            <div class="col-md-5">
                <input type="text" class="form-control producto-buscar-editar" placeholder="Buscar producto..." list="listaProductosEditar">
                <input type="hidden" class="producto-id-editar">
            </div>
            <div class="col-md-3">
                <input type="number" step="0.1" class="form-control producto-cantidad-editar" placeholder="Cantidad">
            </div>
            <div class="col-md-3">
                <input type="number" step="0.01" class="form-control producto-precio-editar" placeholder="Precio">
            </div>
            <div class="col-md-1">
                <button class="btn btn-danger btn-sm eliminar-fila-editar" type="button">✖</button>
            </div>
        </div>
    `;
    contenedor.insertAdjacentHTML('beforeend', html);
    const nuevaFila = document.getElementById(filaId);
    const inputBuscar = nuevaFila.querySelector('.producto-buscar-editar');
    const inputId = nuevaFila.querySelector('.producto-id-editar');
    const inputCantidad = nuevaFila.querySelector('.producto-cantidad-editar');
    const inputPrecio = nuevaFila.querySelector('.producto-precio-editar');
    const btnEliminar = nuevaFila.querySelector('.eliminar-fila-editar');

    // Evento para autocompletar producto (similar a la venta nueva)
    inputBuscar.addEventListener('change', async function() {
        const nombre = this.value;
        if (!nombre) return;
        const prod = productosTerminados.find(p => p.nombre === nombre);
        if (prod) {
            inputId.value = prod.id;
            inputPrecio.value = prod.precio || 0;
            calcularTotalEdicion();
        }
    });
    inputBuscar.addEventListener('input', function() {
        const nombre = this.value;
        const match = productosTerminados.some(p => p.nombre === nombre);
        if (!match) {
            inputId.value = '';
            inputPrecio.value = '';
        }
        calcularTotalEdicion();
    });
    inputCantidad.addEventListener('input', calcularTotalEdicion);
    inputPrecio.addEventListener('input', calcularTotalEdicion);
    btnEliminar.addEventListener('click', () => {
        nuevaFila.remove();
        calcularTotalEdicion();
    });

    if (detalle) {
        // Si se pasa un detalle, buscar el producto por ID para llenar
        const producto = productosTerminados.find(p => p.id === detalle.producto_id);
        if (producto) {
            inputBuscar.value = producto.nombre;
            inputId.value = producto.id;
            inputCantidad.value = detalle.cantidad;
            inputPrecio.value = detalle.precio_unitario;
        }
    }
}

async function cargarProductosEnSelectCompra(selectElement) {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const productos = data.productos || data;
        const comprables = productos.filter(p => p.tipo === 'materia_prima' || p.tipo === 'insumo');
        
        selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';
        comprables.forEach(p => {
            selectElement.innerHTML += `<option value="${p.id}" data-precio="${p.precio || 0}">${p.nombre} (${p.codigo})</option>`;
        });
    } catch (error) {
        console.error("Error:", error);
    }
}

async function eliminarVenta(id) {
    if (!confirm(`¿Estás seguro de eliminar la venta #${id}?\nEsta acción no se puede deshacer.`)) return;

    try {
        const response = await fetch(`${API_URL}/ventas/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (response.ok) {
            mostrarAlerta(`✅ Venta #${id} eliminada`, 'success');
            cargarVentas(); // Recargar la tabla
        } else {
            mostrarAlerta(data.error || 'Error al eliminar', 'danger');
        }
    } catch (error) {
        console.error("Error en eliminarVenta:", error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// Inicializar modal de compra
document.getElementById('modalCompra')?.addEventListener('show.bs.modal', async function() {
    console.log("Modal de compra abierto");
    await cargarProveedoresSelector();
    await cargarProductosCompraSelector();
    setupCompraPrecioAuto();
});

document.getElementById('agregarProductoCompra')?.addEventListener('click', agregarFilaCompra);
