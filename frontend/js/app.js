// =============================================
// CONFIGURACIÓN
// =============================================
const API_URL = 'http://127.0.0.1:5000'; // Para pruebas locales

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================
function mostrarAlerta(mensaje, tipo) {
    const alerta = document.getElementById('alerta');
    if (!alerta) return;
    alerta.className = `alert alert-${tipo}`;
    alerta.textContent = mensaje;
    alerta.classList.remove('d-none');
    setTimeout(() => {
        alerta.classList.add('d-none');
    }, 3000);
}

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-EC');
}

function formatearMoneda(valor) {
    return `$${Number(valor).toLocaleString('es-EC')}`;
}

// =============================================
// FUNCIONES DE CARGA DE DATOS
// =============================================

async function cargarProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        const tbody = document.getElementById('tabla-productos');
        if (!tbody) return;
        
        if (data.productos && data.productos.length > 0) {
            tbody.innerHTML = data.productos.map(p => `
                <tr>
                    <td>${p.codigo}</td>
                    <td>${p.nombre}</td>
                    <td>${p.tipo.replace('_', ' ')}</td>
                    <td>${p.unidad_medida}</td>
                    <td>${p.stock_minimo}</td>
                    <td>
                        <button class="btn btn-sm btn-warning" onclick="editarProducto(${p.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarProducto(${p.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            const totalProd = document.getElementById('total-productos');
            if (totalProd) totalProd.textContent = data.total || data.productos.length;
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay productos</td></tr>';
            const totalProd = document.getElementById('total-productos');
            if (totalProd) totalProd.textContent = '0';
        }
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

async function cargarVentas() {
    try {
        const response = await fetch(`${API_URL}/ventas`);
        const ventas = await response.json();
        const tbody = document.getElementById('tabla-ventas');
        if (!tbody) return;
        
        if (ventas.length > 0) {
            tbody.innerHTML = ventas.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td>${formatearFecha(v.fecha)}</td>
                    <td>${v.cliente}</td>
                    <td>${formatearMoneda(v.total)}</td>
                    <td><span class="badge bg-${v.estado_pago === 'pagado' ? 'success' : 'warning'}">${v.estado_pago}</span></td>
                    <td>${formatearFecha(v.fecha_pactada)}</td>
                    <td><button class="btn btn-sm btn-info" onclick="verDetalleVenta(${v.id})"><i class="fas fa-eye"></i></button></td>
                </tr>
            `).join('');
            
            const pendientes = ventas.filter(v => v.estado_pago === 'pendiente');
            const pendientesEl = document.getElementById('ventas-pendientes');
            if (pendientesEl) pendientesEl.textContent = pendientes.length;
            
            const totalCobrar = pendientes.reduce((sum, v) => sum + v.total, 0);
            const totalCobrarEl = document.getElementById('total-cobrar');
            if (totalCobrarEl) totalCobrarEl.textContent = formatearMoneda(totalCobrar);
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No hay ventas</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando ventas:', error);
    }
}

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/terceros?tipo=cliente`);
        const data = await response.json();
        const tbody = document.getElementById('tabla-clientes');
        if (!tbody) return;
        
        const clientes = data.terceros || data;
        if (clientes.length > 0) {
            tbody.innerHTML = clientes.map(c => `
                <tr>
                    <td>${c.nombre}</td>
                    <td>${c.telefono || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.forma_pago || '-'}</td>
                    <td><button class="btn btn-sm btn-warning"><i class="fas fa-edit"></i></button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No hay clientes</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando clientes:', error);
    }
}

// =============================================
// FUNCIONES DE ACCIÓN
// =============================================

async function guardarProducto() {
    const producto = {
        codigo: document.getElementById('productoCodigo').value,
        nombre: document.getElementById('productoNombre').value,
        tipo: document.getElementById('productoTipo').value,
        unidad_medida: document.getElementById('productoUnidad').value,
        stock_minimo: parseInt(document.getElementById('productoStockMinimo').value) || 0
    };
    
    try {
        const response = await fetch(`${API_URL}/productos`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(producto)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Producto creado exitosamente', 'success');
            document.getElementById('formProducto').reset();
            bootstrap.Modal.getInstance(document.getElementById('modalProducto')).hide();
            cargarProductos();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al crear producto', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

// =============================================
// INICIALIZACIÓN
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    const fechaEl = document.getElementById('fecha-actual');
    if (fechaEl) {
        fechaEl.textContent = new Date().toLocaleDateString('es-EC', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });
    }
    
    cargarProductos();
    cargarVentas();
    cargarClientes();
    
    setInterval(() => {
        cargarProductos();
        cargarVentas();
        cargarClientes();
    }, 300000);
});
// =============================================
// MÓDULO DE COMPRAS
// =============================================

let productosListaCompra = [];

async function cargarProveedores() {
    try {
        const response = await fetch(`${API_URL}/proveedores`);
        const proveedores = await response.json();
        
        const select = document.getElementById('compraProveedor');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar proveedor...</option>';
            proveedores.forEach(p => {
                select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
    }
}

async function cargarProductosCompra() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        productosListaCompra = data.productos || data;
        
        document.querySelectorAll('.producto-select-compra').forEach(select => {
            actualizarSelectorProductoCompra(select);
        });
    } catch (error) {
        console.error('Error cargando productos:', error);
    }
}

function actualizarSelectorProductoCompra(selectElement) {
    const currentValue = selectElement.value;
    selectElement.innerHTML = '<option value="">Seleccionar producto...</option>';
    
    productosListaCompra.forEach(p => {
        selectElement.innerHTML += `<option value="${p.id}">${p.nombre} (${p.codigo})</option>`;
    });
    
    if (currentValue) selectElement.value = currentValue;
}

// Agregar nueva línea de producto
document.getElementById('agregarProductoCompra')?.addEventListener('click', function() {
    const contenedor = document.getElementById('contenedor-productos-compra');
    const nuevoProducto = document.querySelector('.producto-compra-item').cloneNode(true);
    
    nuevoProducto.querySelector('.producto-select-compra').value = '';
    nuevoProducto.querySelector('.producto-cantidad-compra').value = '';
    nuevoProducto.querySelector('.producto-precio-compra').value = '';
    nuevoProducto.querySelector('.eliminar-producto-compra').style.display = 'block';
    
    nuevoProducto.querySelector('.eliminar-producto-compra').addEventListener('click', function() {
        nuevoProducto.remove();
        calcularTotalCompra();
    });
    
    nuevoProducto.querySelector('.producto-select-compra').addEventListener('change', function() {
        calcularTotalCompra();
    });
    nuevoProducto.querySelector('.producto-cantidad-compra').addEventListener('input', calcularTotalCompra);
    nuevoProducto.querySelector('.producto-precio-compra').addEventListener('input', calcularTotalCompra);
    
    actualizarSelectorProductoCompra(nuevoProducto.querySelector('.producto-select-compra'));
    
    contenedor.appendChild(nuevoProducto);
});

function calcularTotalCompra() {
    let total = 0;
    document.querySelectorAll('.producto-compra-item').forEach(item => {
        const cantidad = parseFloat(item.querySelector('.producto-cantidad-compra').value) || 0;
        const precio = parseFloat(item.querySelector('.producto-precio-compra').value) || 0;
        total += cantidad * precio;
    });
    document.getElementById('compraTotal').textContent = total.toLocaleString('es-EC');
    return total;
}

async function guardarCompra() {
    const proveedorId = document.getElementById('compraProveedor').value;
    if (!proveedorId) {
        mostrarAlerta('Debe seleccionar un proveedor', 'warning');
        return;
    }
    
    const productos = [];
    let valido = true;
    
    document.querySelectorAll('.producto-compra-item').forEach(item => {
        const productoId = item.querySelector('.producto-select-compra').value;
        const cantidad = parseFloat(item.querySelector('.producto-cantidad-compra').value);
        const precio = parseFloat(item.querySelector('.producto-precio-compra').value);
        
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
    
    if (!valido) {
        mostrarAlerta('Complete correctamente todos los productos', 'warning');
        return;
    }
    
    if (productos.length === 0) {
        mostrarAlerta('Debe agregar al menos un producto', 'warning');
        return;
    }
    
    const compra = {
        proveedor_id: parseInt(proveedorId),
        fecha_compra: document.getElementById('compraFecha').value || null,
        observaciones: document.getElementById('compraObservaciones').value,
        productos: productos
    };
    
    try {
        const response = await fetch(`${API_URL}/compras`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(compra)
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Compra guardada exitosamente', 'success');
            document.getElementById('formCompra').reset();
            document.getElementById('contenedor-productos-compra').innerHTML = `
                <div class="row mb-2 producto-compra-item">
                    <div class="col-md-5">
                        <select class="form-control producto-select-compra" required>
                            <option value="">Seleccionar producto...</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control producto-cantidad-compra" 
                               placeholder="Cantidad" min="0.1" step="0.1" required>
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control producto-precio-compra" 
                               placeholder="Precio unit." min="0" step="100" required>
                    </div>
                    <div class="col-md-1">
                        <button type="button" class="btn btn-danger btn-sm eliminar-producto-compra" style="display: none;">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            
            bootstrap.Modal.getInstance(document.getElementById('modalCompra')).hide();
            await cargarCompras();
            await cargarProductosCompra();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al guardar compra', 'danger');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function cargarCompras() {
    try {
        const response = await fetch(`${API_URL}/compras`);
        const compras = await response.json();
        
        const tbody = document.getElementById('tabla-compras');
        if (!tbody) return;
        
        if (compras.length > 0) {
            tbody.innerHTML = compras.map(c => `
                <tr class="${c.estado === 'pendiente' ? 'table-warning' : c.estado === 'recibida' ? 'table-info' : ''}">
                    <td>${c.id}</td>
                    <td>${formatearFecha(c.fecha_compra)}</td>
                    <td>${c.proveedor_nombre || c.proveedor?.nombre || 'N/A'}</td>
                    <td>${formatearMoneda(c.total)}</td>
                    <td>
                        <span class="badge bg-${c.estado === 'pagada' ? 'success' : c.estado === 'recibida' ? 'info' : 'warning'}">
                            ${c.estado}
                        </span>
                    </td>
                    <td>
                        ${c.estado === 'pendiente' ? 
                            `<button class="btn btn-sm btn-primary" onclick="recibirCompra(${c.id})">
                                <i class="fas fa-check"></i> Recibir
                            </button>` : 
                            c.estado === 'recibida' ?
                            `<button class="btn btn-sm btn-success" onclick="pagarCompra(${c.id})">
                                <i class="fas fa-money-bill"></i> Pagar
                            </button>` :
                            '<span class="text-success">✓ Pagado</span>'
                        }
                        <button class="btn btn-sm btn-info" onclick="verDetalleCompra(${c.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
            
            const pendientes = compras.filter(c => c.estado === 'pendiente');
            const recibidas = compras.filter(c => c.estado === 'recibida');
            const mesActual = new Date().getMonth();
            const totalMes = compras.filter(c => {
                const fecha = new Date(c.fecha_compra);
                return fecha.getMonth() === mesActual;
            }).reduce((sum, c) => sum + (c.total || 0), 0);
            
            document.getElementById('compras-pendientes').textContent = pendientes.length;
            document.getElementById('compras-recibidas').textContent = recibidas.length;
            document.getElementById('total-gastado').textContent = formatearMoneda(totalMes);
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No hay compras</td></tr>';
        }
    } catch (error) {
        console.error('Error cargando compras:', error);
    }
}

async function recibirCompra(id) {
    if (!confirm('¿Confirmar recepción de esta compra? Se actualizará el stock automáticamente')) return;
    
    try {
        const response = await fetch(`${API_URL}/compras/${id}/recibir`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Compra recibida y stock actualizado', 'success');
            cargarCompras();
            cargarMateriaPrima();
            cargarProductos();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al recibir compra', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function pagarCompra(id) {
    const monto = prompt('Ingrese el monto a pagar:');
    if (!monto) return;
    
    const metodo = prompt('Método de pago (Efectivo/Transferencia/Tarjeta):', 'Efectivo');
    if (!metodo) return;
    
    try {
        const response = await fetch(`${API_URL}/compras/${id}/pagar`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                monto: parseFloat(monto),
                metodo_pago: metodo
            })
        });
        
        if (response.ok) {
            mostrarAlerta('✅ Pago registrado exitosamente', 'success');
            cargarCompras();
        } else {
            const error = await response.json();
            mostrarAlerta(error.error || 'Error al registrar pago', 'danger');
        }
    } catch (error) {
        mostrarAlerta('Error de conexión', 'danger');
    }
}

async function verDetalleCompra(id) {
    try {
        const response = await fetch(`${API_URL}/compras/${id}`);
        const data = await response.json();
        
        let mensaje = `COMPRA #${id}\n`;
        mensaje += `Proveedor: ${data.compra.proveedor.nombre}\n`;
        mensaje += `Fecha: ${formatearFecha(data.compra.fecha_compra)}\n`;
        mensaje += `Estado: ${data.compra.estado}\n`;
        mensaje += `Total: ${formatearMoneda(data.compra.total)}\n\n`;
        mensaje += `PRODUCTOS:\n`;
        
        data.detalles.forEach(d => {
            mensaje += `- ${d.producto.nombre}: ${d.cantidad} x $${d.precio_unitario} = $${d.subtotal}\n`;
        });
        
        alert(mensaje);
    } catch (error) {
        console.error('Error:', error);
        mostrarAlerta('Error al cargar detalle', 'danger');
    }
}

// Inicializar modal de compra
document.getElementById('modalCompra')?.addEventListener('show.bs.modal', async function() {
    await cargarProveedores();
    await cargarProductosCompra();
    
    const primeraFila = document.querySelector('.producto-compra-item');
    if (primeraFila) {
        primeraFila.querySelector('.producto-select-compra').addEventListener('change', calcularTotalCompra);
        primeraFila.querySelector('.producto-cantidad-compra').addEventListener('input', calcularTotalCompra);
        primeraFila.querySelector('.producto-precio-compra').addEventListener('input', calcularTotalCompra);
    }
});
