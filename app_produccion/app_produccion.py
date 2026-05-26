#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ECUAPULP - Módulo de Producción
App local para registrar producción en el taller
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from datetime import datetime
import requests
import threading
import json

# =============================================
# CONFIGURACIÓN
# =============================================
API_URL = 'http://127.0.0.1:5000'  # Local

class ProduccionApp:
    def __init__(self, root):
        self.root = root
        self.root.title("ECUAPULP - Módulo de Producción")
        self.root.geometry("1000x750")
        self.root.configure(bg='#f0f0f0')
        
        # Variables
        self.orden_actual = None
        self.etapas = []
        self.productos = []
        self.empleados = []
        self.etapa_actual_index = 0
        self.etapa_actual = None
        self.etapa_inicio = None
        self.empleado_actual = None
        self.registros_etapas = []
        
        self.setup_ui()
        self.cargar_datos_iniciales()
    
    def setup_ui(self):
        """Configurar la interfaz gráfica"""
        # Frame superior (título)
        top_frame = tk.Frame(self.root, bg='#2c3e50', height=70)
        top_frame.pack(fill='x')
        top_frame.pack_propagate(False)
        
        titulo = tk.Label(top_frame, text="🏭 ECUAPULP - Control de Producción", 
                         font=('Arial', 18, 'bold'), bg='#2c3e50', fg='white')
        titulo.pack(pady=15)
        
        subtitulo = tk.Label(top_frame, text="Registro de tiempos y responsables por etapa", 
                            font=('Arial', 10), bg='#2c3e50', fg='#bdc3c7')
        subtitulo.pack()
        
        # Frame principal
        main_frame = tk.Frame(self.root, bg='#f0f0f0')
        main_frame.pack(fill='both', expand=True, padx=15, pady=10)
        
        # ========== SECCIÓN NUEVA PRODUCCIÓN ==========
        nueva_frame = tk.LabelFrame(main_frame, text="📋 NUEVA PRODUCCIÓN", 
                                    font=('Arial', 12, 'bold'), bg='#f0f0f0', fg='#2c3e50')
        nueva_frame.pack(fill='x', pady=5, padx=5)
        
        # Contenedor interno
        nueva_inner = tk.Frame(nueva_frame, bg='#f0f0f0')
        nueva_inner.pack(pady=10, padx=10)
        
        # Selección de producto
        tk.Label(nueva_inner, text="Producto:", bg='#f0f0f0', font=('Arial', 10)).grid(row=0, column=0, padx=5, pady=5, sticky='w')
        self.producto_var = tk.StringVar()
        self.producto_combo = ttk.Combobox(nueva_inner, textvariable=self.producto_var, width=35, font=('Arial', 10))
        self.producto_combo.grid(row=0, column=1, padx=5, pady=5)
        
        # Cantidad objetivo
        tk.Label(nueva_inner, text="Cantidad objetivo (kg):", bg='#f0f0f0', font=('Arial', 10)).grid(row=0, column=2, padx=5, pady=5, sticky='w')
        self.cantidad_var = tk.StringVar()
        self.cantidad_entry = tk.Entry(nueva_inner, textvariable=self.cantidad_var, width=12, font=('Arial', 10))
        self.cantidad_entry.grid(row=0, column=3, padx=5, pady=5)
        
        # Botón crear
        self.btn_crear = tk.Button(nueva_inner, text="➕ CREAR ORDEN", 
                                   command=self.crear_orden, bg='#27ae60', fg='white',
                                   font=('Arial', 10, 'bold'), width=15, height=1)
        self.btn_crear.grid(row=0, column=4, padx=20, pady=5)
        
        # ========== SECCIÓN PRODUCCIÓN ACTUAL ==========
        actual_frame = tk.LabelFrame(main_frame, text="🏭 PRODUCCIÓN ACTUAL", 
                                     font=('Arial', 12, 'bold'), bg='#f0f0f0', fg='#2c3e50')
        actual_frame.pack(fill='both', expand=True, pady=10, padx=5)
        
        # Información del lote
        lote_info_frame = tk.Frame(actual_frame, bg='#e8f5e9', relief='solid', bd=1)
        lote_info_frame.pack(fill='x', pady=5, padx=5)
        
        self.lote_info = tk.Label(lote_info_frame, text="📦 No hay producción activa", 
                                  font=('Arial', 11, 'bold'), bg='#e8f5e9', fg='#2c3e50', pady=10)
        self.lote_info.pack()
        
        # Tabla de etapas
        tree_frame = tk.Frame(actual_frame, bg='#f0f0f0')
        tree_frame.pack(fill='both', expand=True, pady=5, padx=5)
        
        scrollbar = ttk.Scrollbar(tree_frame)
        scrollbar.pack(side='right', fill='y')
        
        self.tree = ttk.Treeview(tree_frame, columns=('etapa', 'responsable', 'inicio', 'fin', 'tiempo', 'estado'), 
                                 show='headings', height=8, yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.tree.yview)
        
        self.tree.heading('etapa', text='Etapa')
        self.tree.heading('responsable', text='Responsable')
        self.tree.heading('inicio', text='Inicio')
        self.tree.heading('fin', text='Fin')
        self.tree.heading('tiempo', text='Tiempo')
        self.tree.heading('estado', text='Estado')
        
        self.tree.column('etapa', width=200)
        self.tree.column('responsable', width=150)
        self.tree.column('inicio', width=80)
        self.tree.column('fin', width=80)
        self.tree.column('tiempo', width=80)
        self.tree.column('estado', width=80)
        
        self.tree.pack(fill='both', expand=True)
        
        # Botones de acción
        acciones_frame = tk.Frame(actual_frame, bg='#f0f0f0')
        acciones_frame.pack(pady=10)
        
        self.btn_iniciar_etapa = tk.Button(acciones_frame, text="▶ INICIAR ETAPA", 
                                           command=self.iniciar_etapa, bg='#3498db', fg='white',
                                           font=('Arial', 10, 'bold'), width=15, state='disabled')
        self.btn_iniciar_etapa.pack(side='left', padx=5)
        
        self.btn_finalizar_etapa = tk.Button(acciones_frame, text="⏹ FINALIZAR ETAPA", 
                                             command=self.finalizar_etapa, bg='#e67e22', fg='white',
                                             font=('Arial', 10, 'bold'), width=15, state='disabled')
        self.btn_finalizar_etapa.pack(side='left', padx=5)
        
        self.btn_finalizar_produccion = tk.Button(acciones_frame, text="✅ FINALIZAR PRODUCCIÓN", 
                                                  command=self.finalizar_produccion, bg='#27ae60', fg='white',
                                                  font=('Arial', 10, 'bold'), width=20, state='disabled')
        self.btn_finalizar_produccion.pack(side='left', padx=5)
        
        # ========== SECCIÓN ESTADO ==========
        estado_frame = tk.Frame(self.root, bg='#ecf0f1', height=35)
        estado_frame.pack(fill='x', side='bottom')
        estado_frame.pack_propagate(False)
        
        self.estado_label = tk.Label(estado_frame, text="🟢 Conectado a la API", 
                                     bg='#ecf0f1', fg='#27ae60', font=('Arial', 9))
        self.estado_label.pack(side='left', padx=10, pady=8)
        
        self.sync_label = tk.Label(estado_frame, text="📡 Listo", 
                                   bg='#ecf0f1', fg='#7f8c8d', font=('Arial', 9))
        self.sync_label.pack(side='right', padx=10, pady=8)
    
    def cargar_datos_iniciales(self):
        """Cargar datos desde la API"""
        def cargar():
            try:
                # Cargar productos
                res = requests.get(f"{API_URL}/productos")
                if res.status_code == 200:
                    data = res.json()
                    self.productos = data.get('productos', data)
                    productos_lista = [f"{p['id']}|{p['nombre']}" for p in self.productos if p.get('tipo') in ['producto_terminado', 'materia_prima']]
                    self.producto_combo['values'] = productos_lista
                
                # Cargar empleados
                res = requests.get(f"{API_URL}/produccion/empleados")
                if res.status_code == 200:
                    self.empleados = res.json()
                
                # Cargar etapas
                res = requests.get(f"{API_URL}/produccion/etapas")
                if res.status_code == 200:
                    self.etapas = res.json()
                
                self.root.after(0, lambda: self.estado_label.config(text="🟢 Conectado a la API", fg='#27ae60'))
                self.root.after(0, lambda: self.sync_label.config(text=f"📡 Datos cargados: {datetime.now().strftime('%H:%M:%S')}"))
                
            except Exception as e:
                self.root.after(0, lambda: self.estado_label.config(text=f"🔴 Error: {str(e)[:40]}", fg='#e74c3c'))
                self.root.after(0, lambda: messagebox.showerror("Error de conexión", f"No se pudo conectar a la API:\n{e}"))
        
        threading.Thread(target=cargar, daemon=True).start()
    
    def crear_orden(self):
        """Crear una nueva orden de producción"""
        if not self.producto_var.get():
            messagebox.showwarning("Campos incompletos", "Seleccione un producto")
            return
        
        if not self.cantidad_var.get():
            messagebox.showwarning("Campos incompletos", "Ingrese la cantidad")
            return
        
        try:
            producto_id = int(self.producto_var.get().split('|')[0])
            cantidad = float(self.cantidad_var.get())
            
            data = {
                "producto_id": producto_id,
                "cantidad_objetivo": cantidad,
                "estado": "planeada"
            }
            
            res = requests.post(f"{API_URL}/produccion/ordenes", json=data)
            if res.status_code == 201:
                self.orden_actual = res.json()['orden']
                self.lote_info.config(text=f"📦 LOTE: {self.orden_actual['lote_codigo']} | Producto: {self.producto_var.get().split('|')[1]} | Objetivo: {cantidad} kg")
                
                # Habilitar botones
                self.btn_iniciar_etapa.config(state='normal')
                self.btn_finalizar_etapa.config(state='normal')
                self.btn_finalizar_produccion.config(state='normal')
                
                # Iniciar primera etapa
                self.etapa_actual_index = 0
                if self.etapas:
                    self.etapa_actual = self.etapas[self.etapa_actual_index]
                    messagebox.showinfo("Éxito", f"Orden creada: {self.orden_actual['lote_codigo']}\n\nEtapa siguiente: {self.etapa_actual['nombre']}")
                else:
                    messagebox.showinfo("Éxito", f"Orden creada: {self.orden_actual['lote_codigo']}")
                
                self.sync_label.config(text=f"📡 Orden creada: {datetime.now().strftime('%H:%M:%S')}")
            else:
                messagebox.showerror("Error", f"Error al crear orden: {res.text}")
        except Exception as e:
            messagebox.showerror("Error", f"Error: {e}")
    
    def iniciar_etapa(self):
        """Iniciar una etapa de producción"""
        if not self.orden_actual:
            messagebox.showwarning("Sin orden", "Primero debe crear una orden")
            return
        
        if not self.etapas:
            messagebox.showwarning("Sin etapas", "No hay etapas configuradas")
            return
        
        if self.etapa_actual_index >= len(self.etapas):
            messagebox.showinfo("Completado", "Todas las etapas están completadas")
            return
        
        if not self.empleados:
            messagebox.showwarning("Sin empleados", "No hay empleados registrados")
            return
        
        # Ventana para seleccionar responsable
        self.seleccionar_responsable()
    
    def seleccionar_responsable(self):
        """Ventana para seleccionar responsable de la etapa"""
        top = tk.Toplevel(self.root)
        top.title("Seleccionar responsable")
        top.geometry("350x200")
        top.transient(self.root)
        top.grab_set()
        top.configure(bg='#f0f0f0')
        
        etapa_nombre = self.etapas[self.etapa_actual_index]['nombre']
        
        tk.Label(top, text=f"Etapa: {etapa_nombre}", font=('Arial', 12, 'bold'), 
                bg='#f0f0f0', fg='#2c3e50').pack(pady=10)
        
        tk.Label(top, text="Seleccione el responsable:", bg='#f0f0f0').pack(pady=5)
        
        empleado_var = tk.StringVar()
        empleado_combo = ttk.Combobox(top, textvariable=empleado_var, 
                                      values=[e['nombre'] for e in self.empleados], 
                                      width=30, state='readonly')
        empleado_combo.pack(pady=5)
        
        def confirmar():
            if not empleado_var.get():
                messagebox.showwarning("Selección requerida", "Debe seleccionar un responsable")
                return
            
            empleado = next(e for e in self.empleados if e['nombre'] == empleado_var.get())
            self.empleado_actual = empleado['id']
            self.etapa_inicio = datetime.now()
            top.destroy()
            
            messagebox.showinfo("Etapa iniciada", 
                               f"✅ Etapa: {etapa_nombre}\n"
                               f"👤 Responsable: {empleado['nombre']}\n"
                               f"⏰ Inicio: {self.etapa_inicio.strftime('%H:%M:%S')}")
            
            self.sync_label.config(text=f"📡 Etapa iniciada: {datetime.now().strftime('%H:%M:%S')}")
        
        tk.Button(top, text="✅ INICIAR ETAPA", command=confirmar, 
                 bg='#3498db', fg='white', font=('Arial', 10, 'bold')).pack(pady=15)
    
    def finalizar_etapa(self):
        """Finalizar la etapa actual"""
        if not hasattr(self, 'etapa_inicio') or not self.etapa_inicio:
            messagebox.showwarning("Sin inicio", "Primero debe iniciar la etapa")
            return
        
        etapa = self.etapas[self.etapa_actual_index]
        hora_fin = datetime.now()
        hora_inicio = self.etapa_inicio
        tiempo_minutos = int((hora_fin - hora_inicio).total_seconds() / 60)
        tiempo_segundos = int((hora_fin - hora_inicio).total_seconds() % 60)
        
        # Registrar en la API
        data = {
            "orden_id": self.orden_actual['id'],
            "etapa_id": etapa['id'],
            "empleado_id": self.empleado_actual,
            "hora_inicio": hora_inicio.strftime("%H:%M"),
            "hora_fin": hora_fin.strftime("%H:%M"),
            "observaciones": ""
        }
        
        try:
            res = requests.post(f"{API_URL}/produccion/registro-etapa", json=data)
            if res.status_code == 201:
                # Guardar registro localmente
                empleado_nombre = next(e['nombre'] for e in self.empleados if e['id'] == self.empleado_actual)
                self.registros_etapas.append({
                    'etapa': etapa['nombre'],
                    'responsable': empleado_nombre,
                    'inicio': hora_inicio.strftime("%H:%M"),
                    'fin': hora_fin.strftime("%H:%M"),
                    'tiempo': f"{tiempo_minutos}m {tiempo_segundos}s"
                })
                
                # Agregar a la tabla
                self.tree.insert('', 'end', values=(
                    etapa['nombre'],
                    empleado_nombre,
                    hora_inicio.strftime("%H:%M"),
                    hora_fin.strftime("%H:%M"),
                    f"{tiempo_minutos}m {tiempo_segundos}s",
                    "✅"
                ))
                
                self.etapa_actual_index += 1
                self.etapa_inicio = None
                
                if self.etapa_actual_index >= len(self.etapas):
                    messagebox.showinfo("Completado", 
                                       f"🎉 Todas las etapas finalizadas!\n"
                                       f"Tiempo total registrado.\n"
                                       f"Puede finalizar la producción.")
                else:
                    siguiente = self.etapas[self.etapa_actual_index]['nombre']
                    messagebox.showinfo("Etapa completada", 
                                       f"✅ {etapa['nombre']} completada\n"
                                       f"⏱️ Tiempo: {tiempo_minutos}m {tiempo_segundos}s\n\n"
                                       f"📌 Siguiente etapa: {siguiente}")
                
                self.sync_label.config(text=f"📡 Etapa registrada: {datetime.now().strftime('%H:%M:%S')}")
            else:
                messagebox.showerror("Error", f"Error al registrar etapa: {res.text}")
        except Exception as e:
            messagebox.showerror("Error", f"Error: {e}")
    
    def finalizar_produccion(self):
        """Finalizar la producción completa"""
        if not self.orden_actual:
            messagebox.showwarning("Sin orden", "No hay producción activa")
            return
        
        # Mostrar resumen de etapas
        resumen = f"📊 RESUMEN DE PRODUCCIÓN\n"
        resumen += f"Lote: {self.orden_actual['lote_codigo']}\n"
        resumen += "=" * 30 + "\n\n"
        
        for reg in self.registros_etapas:
            resumen += f"📌 {reg['etapa']}\n"
            resumen += f"   Responsable: {reg['responsable']}\n"
            resumen += f"   Tiempo: {reg['tiempo']}\n\n"
        
        if self.registros_etapas:
            messagebox.showinfo("Resumen de producción", resumen)
        
        cantidad = messagebox.askfloat("Cantidad obtenida", "Ingrese la cantidad obtenida (kg):", minvalue=0)
        if cantidad is None:
            return
        
        try:
            res = requests.put(f"{API_URL}/produccion/ordenes/{self.orden_actual['id']}/finalizar", 
                              json={"cantidad_obtenida": cantidad})
            if res.status_code == 200:
                messagebox.showinfo("Éxito", f"🎉 Producción finalizada!\n\n"
                                   f"Lote: {self.orden_actual['lote_codigo']}\n"
                                   f"Objetivo: {self.orden_actual['cantidad_objetivo']} kg\n"
                                   f"Obtenido: {cantidad} kg\n"
                                   f"Rendimiento: {(cantidad/self.orden_actual['cantidad_objetivo']*100):.1f}%")
                
                # Limpiar todo
                self.orden_actual = None
                self.etapa_actual_index = 0
                self.etapa_actual = None
                self.etapa_inicio = None
                self.empleado_actual = None
                self.registros_etapas = []
                
                self.lote_info.config(text="📦 No hay producción activa")
                self.tree.delete(*self.tree.get_children())
                self.btn_iniciar_etapa.config(state='disabled')
                self.btn_finalizar_etapa.config(state='disabled')
                self.btn_finalizar_produccion.config(state='disabled')
                self.producto_var.set('')
                self.cantidad_var.set('')
                
                self.sync_label.config(text=f"📡 Producción finalizada: {datetime.now().strftime('%H:%M:%S')}")
            else:
                messagebox.showerror("Error", f"Error al finalizar: {res.text}")
        except Exception as e:
            messagebox.showerror("Error", f"Error: {e}")

if __name__ == '__main__':
    root = tk.Tk()
    app = ProduccionApp(root)
    root.mainloop()
